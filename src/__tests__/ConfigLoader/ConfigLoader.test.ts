import ConfigLoader from '../../util/ConfigLoader';
import { EXTENSION_NAME } from '../../util/ConfigLoader/const';
import { version, author, repository } from '../../../package.json';
import configJson from '../../config.json';

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
});
