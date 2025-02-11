export enum Verbosity {
    SILENT = 0,
    NORMAL = 1,
    VERBOSE = 2,
}

export type UserConfig = {
    verbosity: Verbosity;
    port: number;
    disabledEndpoints: {
        '/': {
            GET: boolean;
            POST: boolean;
        };
    };
};

export type PackageConfig = {
    version: string;
    author: string;
    name: string;
    githubUrl: string;
};
