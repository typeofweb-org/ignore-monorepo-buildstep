#!/usr/bin/env node

import { existsSync } from "node:fs";
import Path from "node:path";
import { promiseErrorToSettled } from "./utils.js";
import {
	readWorkspaceDirs,
	readWorkspaceSettings,
	resolveWorkspaceDeps,
} from "./pnpmWorkspace.js";
import { compare } from "./git.js";

const cwd = process.cwd();

const [_node, _bin, gitFromPointer = "HEAD^", gitToPointer = "HEAD"] =
	process.argv;

const rootDir = cwd
	.split(Path.sep)
	.map((_, idx) => Path.join(cwd, "../".repeat(idx)))
	.find((path) => existsSync(Path.join(path, "pnpm-workspace.yaml")));

if (!rootDir) {
	throw new Error(`Couldn't determine rootDir!`);
}

const workspaceSettings = await readWorkspaceSettings({ rootDir, cwd });
const workspaceDeps = resolveWorkspaceDeps(
	workspaceSettings.workspaces,
	workspaceSettings.currentWorkspace,
);

const workspaceDepsPaths = workspaceDeps
	.map((name) => workspaceSettings.workspaces[name]?.packagePath)
	.filter((path): path is string => typeof path === "string");

const workspaceDepsRelativePaths = [cwd, ...workspaceDepsPaths].map(
	(path) => Path.relative(cwd, path) || ".",
);

const result = await Promise.all([
	...workspaceDepsRelativePaths.map(async (path) => {
		return {
			result: await promiseErrorToSettled(
				compare({
					from: gitFromPointer,
					to: gitToPointer,
					paths: [path],
					pathsToIgnore: [],
				}),
			),
			path,
		};
	}),
	(async () => {
		const pathsToIgnore = (await readWorkspaceDirs({ rootDir, cwd })).map(
			(path) => Path.relative(cwd, path),
		);
		const relativeRoot = Path.relative(cwd, rootDir);

		return {
			result: await promiseErrorToSettled(
				compare({
					from: gitFromPointer,
					to: gitToPointer,
					paths: [relativeRoot],
					pathsToIgnore,
				}),
			),
			path: relativeRoot,
		};
	})(),
]);

const dirtyTrees = result
	.filter((r) => r.result.status === "rejected")
	.map((d) => "/" + Path.relative(rootDir, Path.resolve(cwd, d.path)))
	.sort();
if (dirtyTrees.length > 0) {
	console.log(
		`
Tree modified at:
${dirtyTrees.join("\n")}
	`.trim(),
	);
	process.exit(1);
} else {
	process.exit(0);
}
