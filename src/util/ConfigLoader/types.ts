export enum Verbosity {
    SILENT = 0,
    NORMAL = 1,
    VERBOSE = 2,
}

export type UserConfig = {
    port: number;
    verbosity: Verbosity;
};

export type PackageConfig = {
    version: string;
    author: string;
    name: string;
    githubUrl: string;
};
