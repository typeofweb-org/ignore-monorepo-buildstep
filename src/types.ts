export type PackageJson = Partial<{
	name: string;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}>;

export type Ctx = {
	cwd: string;
	rootDir: string;
};

export type Workspace = {
	name: string;
	packagePath: string;
	dependsOn: string[];
};
