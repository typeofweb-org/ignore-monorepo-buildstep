import assert from "node:assert";

// VERY simplified polyfill for parseArgs
type Options = {
	type: "boolean";
	default: boolean;
};
export const parseArgs = <Keys extends string>({
	args,
	allowPositionals,
	options,
}: {
	args: string[];
	allowPositionals: true;
	options: Record<Keys, Options>;
}) => {
	if (!allowPositionals) {
		assert(args.every((arg) => arg.startsWith("--")));
	}

	const positionals = args.filter((arg) => !arg.startsWith("--"));

	const defaultNamed = Object.entries(options).map((arg) => {
		const [name, options] = arg as [Keys, Options];
		return [name, options.default];
	});
	const named = args
		.filter((arg) => arg.startsWith("--"))
		.map((arg) => arg.slice(2))
		.map((arg) => [arg, true]);

	return {
		values: Object.fromEntries([...defaultNamed, ...named]) as Record<
			Keys,
			boolean
		>,
		positionals,
	};
};
