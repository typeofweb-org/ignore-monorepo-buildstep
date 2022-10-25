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

export type WorkspaceSettings = {
	workspaces: Record<string, Workspace>;
	currentWorkspace: Workspace;
};

export type PackageManager = "yarn" | "npm" | "pnpm";
