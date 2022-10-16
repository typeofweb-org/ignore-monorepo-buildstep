import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

export const compare = ({
	from,
	to,
	paths,
	pathsToIgnore,
}: {
	from: string;
	to: string;
	paths: string[];
	pathsToIgnore: string[];
}) => {
	return execFileAsync(`git`, [
		`diff`,
		from,
		to,
		`--quiet`,
		...paths,
		...pathsToIgnore.map((path) => `:^${path}`),
	]);
};
