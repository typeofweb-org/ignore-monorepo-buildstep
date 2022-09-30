import { readFile, stat } from "node:fs/promises";

export function promiseErrorToSettled<T>(
	promise: Promise<T>,
): Promise<PromiseSettledResult<T>> {
	return promise.then(
		(result) => ({
			status: "fulfilled",
			value: result,
		}),
		(err) => ({
			status: "rejected",
			reason: err,
		}),
	);
}

export async function fileExist(path: string) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

export async function readJson<T>(path: string): Promise<T> {
	try {
		const json = await readFile(path, "utf-8");
		return JSON.parse(json) as T;
	} catch (err) {
		throw new Error(`Couldn't read JSON at ${path}!`);
	}
}
