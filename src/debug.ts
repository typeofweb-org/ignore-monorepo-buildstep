export const debug =
	(verbose: boolean) =>
	(...args: unknown[]) => {
		if (verbose) {
			console.log(...args);
		}
	};
