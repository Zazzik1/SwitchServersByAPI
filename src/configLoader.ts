import fs from 'fs';
import path from 'path';
import { version, author } from '../package.json';

export type UserConfig = {
    port: number;
    verbosity: 0 | 1 | 2;
};

export type PackageConfig = {
    version: string;
    author: string;
    name: string;
};

const NAME = 'SwitchServersByAPI';

function load() {
    // Uses extensions/<NAME>_<VERSION>/config.json when extension is imported.
    // Uses ./config.json in tests and in dev mode.
    // It assumes that the name of directory is always <NAME>_<VERSION>.
    const configPath =
        typeof __dirname === 'undefined'
            ? path.resolve('extensions', `${NAME}_${version}`, 'config.json')
            : path.resolve(__dirname, 'config.json');
    let userConfig: UserConfig;
    try {
        userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
        throw new Error(
            `[Extension] ${NAME}: Failed to load config from ${configPath}. Does this file exist?`,
        );
    }
    const packageConfig: PackageConfig = {
        version,
        author,
        name: NAME,
    };
    return { userConfig, packageConfig };
}

export default {
    load,
};
