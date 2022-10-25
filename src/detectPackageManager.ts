import Path from "node:path";
import { PackageManager } from "./types.js";
import { isRootDir as isPnpmRootDir } from "./pnpmWorkspace.js";
import { isRootDir as isYarnRootDir } from "./yarnWorkspace.js";

export function detectPackageManager(cwd: string): PackageManager {
	const paths = cwd
		.split(Path.sep)
		.map((_, idx) => Path.join(cwd, "../".repeat(idx)));

	for (const path of paths) {
		if (isPnpmRootDir(path)) return "pnpm";
		if (isYarnRootDir(path)) return "yarn";
	}
	throw new Error("Package manager could not be detected");
}
