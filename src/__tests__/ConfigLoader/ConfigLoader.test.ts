import ConfigLoader from '../../util/ConfigLoader';
import { EXTENSION_NAME } from '../../util/ConfigLoader/const';
import { version, author, repository } from '../../../package.json';
import configJson from '../../config.json';
import fs from 'fs';
import path from 'path';

beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
});

describe('ConfigLoader', () => {
    test('should load config', () => {
        const { packageConfig, userConfig } = ConfigLoader.load();
        expect(packageConfig).toStrictEqual({
            version,
            author,
            name: EXTENSION_NAME,
            githubUrl: repository.url.slice(0, -4),
        });

        expect(userConfig).toStrictEqual(configJson);
    });
    test('should throw error if failed to load config', () => {
        jest.spyOn(path, 'resolve').mockImplementationOnce(
            () => '<PATH_TO_CONFIG_JSON>',
        );
        jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
            throw new Error();
        });
        try {
            ConfigLoader.load();
        } catch (error) {
            expect(error instanceof Error).toBe(true);
            expect((error as Error).message).toBe(
                '[Extension] SwitchServersByAPI: Failed to load config from <PATH_TO_CONFIG_JSON>. Does this file exist?',
            );
        }
    });

    test('getConfigPath method should return correct path if NODE_ENV is production', () => {
        process.env.NODE_ENV = 'production';

        const expectedPath = path.resolve(
            'extensions',
            `${EXTENSION_NAME}_${version}`,
            'config.json',
        );

        expect(ConfigLoader.getConfigPath()).toBe(expectedPath);
    });

    test('getConfigPath method should return correct path if NODE_ENV is not production', () => {
        const expectedPath = path.resolve(__dirname, '..', '..', 'config.json');

        expect(ConfigLoader.getConfigPath()).toBe(expectedPath);
    });
});
