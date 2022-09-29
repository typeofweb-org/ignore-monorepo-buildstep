import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import Path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(exec);

const cwd = process.cwd();

const rootDir = cwd
	.split(Path.sep)
	.map((_, idx) => Path.join(cwd, "../".repeat(idx)))
	.find((path) => existsSync(Path.join(path, "pnpm-workspace.yaml")));

if (!rootDir) {
	throw new Error(`Couldn't determine rootDir!`);
}

const workspaceSettings = await readWorkspaceSettings();
const workspaceDeps = resolveWorkspaceDeps(
	workspaceSettings.workspaces,
	workspaceSettings.currentWorkspace,
);
const workspaceDepsPaths = workspaceDeps.map(
	(name) => workspaceSettings.workspaces[name].packagePath,
);
const workspaceDepsRelativePaths = workspaceDepsPaths.map((path) =>
	Path.relative(cwd, path),
);

try {
	await Promise.all(
		workspaceDepsRelativePaths.map((path) =>
			execAsync(`git diff "HEAD^" "HEAD" --quiet ${path}`),
		),
	);
} catch (err) {
	console.log(err);
	process.exit(1);
}
process.exit(0);

/**
 * --------------------------------------------------
 */

async function readWorkspaceSettings() {
	const workspaceSettingsPath = Path.join(rootDir, "pnpm-workspace.yaml");
	const workspaceSettings = await readFile(workspaceSettingsPath, "utf-8");

	const workspaces = (
		await Promise.all(
			workspaceSettings
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line.startsWith("-"))
				.map((line) => /"([^"]+)"/.exec(line)?.[1]?.trim())
				.filter(
					/**
					 * @returns {x is string}
					 */
					(x) => typeof x === "string",
				)
				// @todo support exclusions?
				.filter((glob) => !glob.startsWith("!"))
				.map((glob) => glob.replace(/\/\*{1,2}$/, ""))
				.map((path) => Path.join(rootDir, path))
				.map(findPackagesInDir),
		)
	)
		.flat()
		.map((w) => [w.name, w]);
	const currentWorkspace = workspaces.find(([, w]) => w.packagePath === cwd)[1];

	return { workspaces: Object.fromEntries(workspaces), currentWorkspace };
}

/**
 * @typedef {{name: string; packagePath: string; dependsOn: string[]}} Workspace
 */

/**
 * @param {Record<string,Workspace>} allWorkspaces
 * @param {Workspace} workspace
 * @returns {string[]}
 */
function resolveWorkspaceDeps(allWorkspaces, { dependsOn }) {
	return [
		...new Set([
			...dependsOn,
			...dependsOn.flatMap((d) =>
				resolveWorkspaceDeps(allWorkspaces, allWorkspaces[d]),
			),
		]),
	];
}

/**
 * @param {string} path
 */
async function findPackagesInDir(path) {
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
				const pkg = await readJson(packageJsonPath);
				const dependsOn = getWorkspaceDeps(pkg);
				return { dependsOn, name: pkg.name, packagePath };
			}),
	);
}

/**
 * @param {string} path
 */
async function fileExist(path) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} path
 */
async function readJson(path) {
	try {
		const json = await readFile(path, "utf-8");
		return JSON.parse(json);
	} catch (err) {
		throw new Error(`Couldn't read JSON at ${path}!`);
	}
}

function getWorkspaceDeps(pkg) {
	const deps = [
		...Object.entries(pkg.dependencies ?? {}),
		...Object.entries(pkg.devDependencies ?? {}),
	]
		.filter(([, version]) => version.startsWith("workspace:"))
		.map(([name]) => name);
	return [...new Set(deps)];
}
