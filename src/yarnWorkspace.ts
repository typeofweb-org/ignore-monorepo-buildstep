import { readFile, readdir } from "node:fs/promises";
import Path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileExist, readJson } from "./utils.js";
import { Ctx, Workspace, WorkspaceSettings, PackageJson } from "./types.js";

export async function readWorkspaceSettings({
	rootDir,
	cwd,
}: Ctx): Promise<WorkspaceSettings> {
	const workspaceDirs = await readWorkspaceDirs({ rootDir, cwd });

	const workspaces = (await Promise.all(workspaceDirs.map(findPackagesInDir)))
		.flat()
		.map((w) => [w.name, w] as const);
	const currentWorkspace = workspaces.find(
		([, w]) => w.packagePath === cwd,
	)?.[1];

	if (!currentWorkspace) {
		throw new Error(`Couldn't find currentWorkspace: ${cwd}`);
	}
	const { name } = currentWorkspace;
	if (!name) {
		throw new Error(`Workspace must have name: ${cwd}`);
	}

	return withoutNodeModules({
		workspaces: Object.fromEntries(workspaces),
		currentWorkspace: { ...currentWorkspace, name },
	});
}

export function resolveWorkspaceDeps(
	allWorkspaces: Record<string, Workspace>,
	{ dependsOn }: Workspace,
): string[] {
	return [
		...new Set([
			...dependsOn,
			...dependsOn.flatMap((d) =>
				allWorkspaces[d]
					? resolveWorkspaceDeps(allWorkspaces, allWorkspaces[d]!)
					: [],
			),
		]),
	];
}

export async function readWorkspaceDirs({ rootDir }: Ctx) {
	const workspaceSettingsPath = Path.join(rootDir, "package.json");
	const workspaceSettings = await readFile(workspaceSettingsPath, "utf-8");
	const workspaces: string[] = JSON.parse(workspaceSettings).workspaces || [];

	return (
		workspaces
			.filter((glob): glob is string => typeof glob === "string")
			// @todo support exclusions?
			.filter((glob) => !glob.startsWith("!"))
			.map((glob) => glob.replace(/\/\*{1,2}$/, ""))
			.map((path) => Path.join(rootDir, path))
	);
}

async function findPackagesInDir(path: string) {
	const directories = await readdir(path);
	const packages = await Promise.all(
		directories.map(async (dir) => {
			const packagePath = Path.join(path, dir);
			const packageJsonPath = Path.join(packagePath, "package.json");
			const exists = await fileExist(packageJsonPath);
			return { packagePath, packageJsonPath, exists };
		}),
	);

	return await Promise.all(
		packages
			.filter(({ exists }) => exists)
			.map(async ({ packagePath, packageJsonPath }) => {
				const pkg = await readJson<PackageJson>(packageJsonPath);
				const dependsOn = getWorkspaceDeps(pkg);
				return { dependsOn, name: pkg.name, packagePath };
			}),
	);
}

function getWorkspaceDeps(pkg: PackageJson) {
	const deps = [
		...Object.entries(pkg.dependencies ?? {}),
		...Object.entries(pkg.devDependencies ?? {}),
	].map(([name]) => name);
	return [...new Set(deps)];
}

function withoutNodeModules(settings: WorkspaceSettings): WorkspaceSettings {
	const allowedDependencies = Object.keys(settings.workspaces);

	function withoutNodeModulesDeps(workspace: Workspace): Workspace {
		return {
			...workspace,
			dependsOn: workspace.dependsOn.filter((pkgName) =>
				allowedDependencies.includes(pkgName),
			),
		};
	}

	const result: WorkspaceSettings = {
		currentWorkspace: withoutNodeModulesDeps(settings.currentWorkspace),
		workspaces: {},
	};
	for (const [name, workspace] of Object.entries(settings.workspaces)) {
		result.workspaces[name] = withoutNodeModulesDeps(workspace);
	}
	return result;
}

export function isRootDir(path: string) {
	const packageJsonPath = Path.join(path, "package.json");
	if (!existsSync(packageJsonPath)) return false;
	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
	if (packageJson.workspaces) return true;
	return false;
}
