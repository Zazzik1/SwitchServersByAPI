import fs from 'fs';
import { version, author, repository } from '../../../package.json';
import { EXTENSION_NAME } from './const';
import { PackageConfig, UserConfig } from './types';
import path from 'path';

class ConfigLoader {
    static load() {
        const configPath = ConfigLoader.getConfigPath();
        let userConfig: UserConfig;
        try {
            userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {
            throw new Error(
                `[Extension] ${EXTENSION_NAME}: Failed to load config from ${configPath}. Does this file exist?`,
            );
        }
        const packageConfig: PackageConfig = {
            version,
            author,
            name: EXTENSION_NAME,
            githubUrl: repository.url.slice(0, -4), // remove .git suffix
        };
        return { userConfig, packageConfig };
    }
    /**
     * Uses extensions/<NAME>_<VERSION>/config.json when extension is imported.
     * Uses ./config.json in tests and in dev mode.
     * It assumes that the name of directory is always <NAME>_<VERSION>.
     */
    static getConfigPath() {
        if (process.env.NODE_ENV === 'production')
            return path.resolve(
                'extensions',
                `${EXTENSION_NAME}_${version}`,
                'config.json',
            );
        return path.resolve(__dirname, '..', '..', 'config.json');
    }
}

export default ConfigLoader;
