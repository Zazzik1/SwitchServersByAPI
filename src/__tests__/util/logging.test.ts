import defaultLogging from '../../util/logging';

describe('defaultLogging', () => {
    test('info', () => {
        const consoleLogSpy = jest
            .spyOn(console, 'log')
            .mockImplementation(() => {});
        defaultLogging.info('abcd');
        expect(consoleLogSpy).toHaveBeenCalledWith('abcd');
    });
});
