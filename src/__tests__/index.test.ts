import SwitchServersByAPI from '../index';
import packageJson from '../../package.json';
import config from '../config.json';
import HTTPServer from '../util/HTTPServer';
import ConfigLoader from '../util/ConfigLoader';
import defaultLogging from '../util/logging';

let handlersGet: unknown[] = [];
let handlersPost: unknown[] = [];
const changeServerMockClient1 = jest.fn();
const changeServerMockClient2 = jest.fn();
const changeServerMockClient3 = jest.fn();

jest.spyOn(defaultLogging, 'info').mockImplementation(() => {});
const serverCloseMock = jest
    .spyOn(HTTPServer.prototype, 'close')
    .mockImplementation(() => {});
const serverListenMock = jest
    .spyOn(HTTPServer.prototype, 'listen')
    .mockImplementation(
        // @ts-expect-error mock
        (_port: number, _host: string, callback: () => void) => {
            callback();
        },
    );

jest.spyOn(HTTPServer.prototype, 'get').mockImplementation((...args) =>
    handlersGet.push(args),
);
jest.spyOn(HTTPServer.prototype, 'post').mockImplementation((...args) =>
    handlersPost.push(args),
);

const SERVERS_MOCK = Object.freeze([
    ['server_A', { name: 'server_A' }],
    ['server_B', { name: 'server_B' }],
]);

const CLIENTS_MOCK_SERVERS = Object.freeze({
    server_A: { name: 'server_A' },
    server_B: { name: 'server_B' },
});

const CLIENTS_MOCK = Object.freeze([
    [
        'uuid_1',
        {
            getName: () => 'name_1',
            UUID: 'uuid_1',
            changeServer: changeServerMockClient1,
            servers: CLIENTS_MOCK_SERVERS,
            server: CLIENTS_MOCK_SERVERS['server_A'],
        },
    ],
    [
        'uuid_2',
        {
            getName: () => 'name_2',
            UUID: 'uuid_2',
            changeServer: changeServerMockClient2,
            servers: CLIENTS_MOCK_SERVERS,
            server: CLIENTS_MOCK_SERVERS['server_A'],
        },
    ],
    [
        'uuid_3',
        {
            getName: () => 'name_3',
            UUID: 'uuid_3',
            changeServer: changeServerMockClient3,
            servers: CLIENTS_MOCK_SERVERS,
            server: CLIENTS_MOCK_SERVERS['server_A'],
        },
    ],
]);

beforeEach(() => {
    jest.clearAllMocks();
    handlersGet = [];
    handlersPost = [];
});

describe('SwitchServersByAPI', () => {
    test('meta informations should be updated', () => {
        const extension = new SwitchServersByAPI();
        expect(extension.name).toBe('SwitchServersByAPI');
        expect(extension.author).toBe(packageJson.author);
        expect(extension.version).toBe(`v${packageJson.version}`);
        expect(extension.reloadable).toBe(true);
        expect(extension.reloadName).toBe('reload_switch_servers_by_api');
    });

    test('reload method should reload the extension', () => {
        const configLoaderMock = jest.spyOn(ConfigLoader, 'load');
        const extension = new SwitchServersByAPI();
        const stopSpy = jest
            .spyOn(extension, 'stopAPIServer')
            .mockImplementation((cb) => cb?.());
        const startSpy = jest
            .spyOn(extension, 'startAPIServer')
            .mockImplementation((cb) => cb?.());
        configLoaderMock.mockReturnValueOnce({
            // @ts-expect-error mock
            userConfig: 'user_config_mock',
        });
        extension.reload();
        expect(stopSpy).toHaveBeenCalled();
        expect(startSpy).toHaveBeenCalled();
        expect(extension.config).toBe('user_config_mock');
    });

    test('stopAPIServer stops the API server', () => {
        const extension = new SwitchServersByAPI();
        const logSpy = jest.spyOn(extension, 'log');
        const callback = jest.fn();
        serverCloseMock.mockImplementationOnce((cb) => cb?.());
        extension.stopAPIServer(callback);
        expect(logSpy).toHaveBeenCalledWith({
            message: 'The API server is now shutting down.',
        });
        expect(serverCloseMock).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith({
            message: 'The API server has been shut down. Goodbye! ✨🔌',
        });
        expect(callback).toHaveBeenCalled();
    });

    test('stopAPIServer logs the error', () => {
        const extension = new SwitchServersByAPI();
        const logSpy = jest.spyOn(extension, 'log');
        // case: error = error log
        serverCloseMock.mockImplementationOnce((cb) =>
            cb?.(new Error('abcdef')),
        );
        extension.stopAPIServer();
        expect(logSpy).toHaveBeenCalledWith({
            message: 'The API server is now shutting down.',
        });
        expect(serverCloseMock).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith({
            message: `Failed to stop the API server. Error: abcdef`,
        });
        // case: no error = no error log
        logSpy.mockClear();
        serverCloseMock.mockImplementationOnce((cb) => cb?.());
        extension.stopAPIServer();
        expect(logSpy).toHaveBeenCalledTimes(2);
        expect(logSpy).toHaveBeenCalledWith({
            message: 'The API server is now shutting down.',
        });
        expect(logSpy).toHaveBeenCalledWith({
            message: 'The API server has been shut down. Goodbye! ✨🔌',
        });
        // case: no server = no logs
        logSpy.mockClear();
        extension.server = undefined;
        const cb = jest.fn();
        extension.stopAPIServer(cb);
        expect(logSpy).toHaveBeenCalledTimes(0);
        expect(cb).toHaveBeenCalled();
    });

    test('startAPIServer should be called when object is constructed', () => {
        const startAPIServerSpy = jest
            .spyOn(SwitchServersByAPI.prototype, 'startAPIServer')
            .mockImplementationOnce(() => {});
        new SwitchServersByAPI();
        expect(startAPIServerSpy).toHaveBeenCalled();
    });

    test('startAPIServer should start listening by calling this.server.listen', (done) => {
        // prevent ext from listening in constructor
        const startAPIServerMock = jest
            .spyOn(SwitchServersByAPI.prototype, 'startAPIServer')
            .mockImplementationOnce(() => {});
        const processOnSpy = jest.spyOn(process, 'on');

        const extension = new SwitchServersByAPI();
        startAPIServerMock.mockRestore();

        expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.anything());
        expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.anything());

        const logSpy = jest.spyOn(extension, 'log');
        extension.startAPIServer(() => {
            expect(serverListenMock).toHaveBeenCalledTimes(1);
            expect(serverListenMock).toHaveBeenCalledWith(
                config.port,
                '0.0.0.0',
                expect.anything(),
            );
            expect(logSpy).toHaveBeenCalledWith({
                message: `The API server is now live at http://127.0.0.1:${extension.config.port} ✅`,
                submessage: `🌟 Check out the project on GitHub for updates: ${extension.githubUrl}`,
            });
            done();
        });
    });

    test('getClientsArray', () => {
        const extension = new SwitchServersByAPI();
        // @ts-expect-error mock
        extension.storage.clients = new Map(CLIENTS_MOCK);
        expect(extension.getClientsArray()).toStrictEqual([
            {
                name: 'name_1',
                uuid: 'uuid_1',
                serverName: 'server_A',
            },
            {
                name: 'name_2',
                uuid: 'uuid_2',
                serverName: 'server_A',
            },
            {
                name: 'name_3',
                uuid: 'uuid_3',
                serverName: 'server_A',
            },
        ]);
    });

    test('clientFullyConnectedHandler adds the client to the map and calls recreateRoutingServersCache', () => {
        const extension = new SwitchServersByAPI();
        expect(extension.storage.clients).toStrictEqual(new Map());
        const cacheSpy = jest
            .spyOn(extension, 'recreateRoutingServersCache')
            .mockImplementation(() => {});
        const client = {
            UUID: 'client_uuid',
            servers: CLIENTS_MOCK_SERVERS,
        };
        // @ts-expect-error mock
        extension.clientFullyConnectedHandler(client);
        expect(cacheSpy).toHaveBeenCalledWith(CLIENTS_MOCK_SERVERS);
        expect(extension.storage.clients.get('client_uuid')).toStrictEqual(
            client,
        );
    });

    test('serverDisconnectHandler removes the client from the map', () => {
        const extension = new SwitchServersByAPI();
        // @ts-expect-error mock
        extension.storage.clients = new Map(CLIENTS_MOCK);
        const cacheSpy = jest
            .spyOn(extension, 'recreateRoutingServersCache')
            .mockImplementation(() => {});
        const server = {
            client: {
                UUID: 'uuid_2',
                servers: CLIENTS_MOCK_SERVERS,
            },
        };
        // @ts-expect-error mock
        extension.serverDisconnectHandler(server);
        expect(cacheSpy).toHaveBeenCalledWith(CLIENTS_MOCK_SERVERS);
        expect(extension.storage.clients.has('uuid_1')).toBe(true);
        expect(extension.storage.clients.has('uuid_2')).toBe(false);
        expect(extension.storage.clients.has('uuid_3')).toBe(true);
    });

    test('GET / returns a list of clients and servers', () => {
        expect(handlersGet.length).toBe(0);
        const extension = new SwitchServersByAPI();
        expect(handlersGet.length).toBe(1);
        // @ts-expect-error mock
        expect(handlersGet[0][0]).toBe('/');
        const sendMock = jest.fn();
        const jsonMock = jest.fn();
        // @ts-expect-error mock
        handlersGet[0][1]({}, { send: sendMock, json: jsonMock });
        expect(jsonMock).toHaveBeenCalledTimes(1);
        expect(jsonMock).toHaveBeenCalledWith(200, {
            clients: [],
            servers: [],
        });
        jsonMock.mockClear();
        // @ts-expect-error mock
        extension.storage.clients = new Map(CLIENTS_MOCK);
        // @ts-expect-error mock
        extension.storage.routingServers = new Map(SERVERS_MOCK);
        // @ts-expect-error mock
        handlersGet[0][1]({}, { send: sendMock, json: jsonMock });
        expect(jsonMock).toHaveBeenCalledTimes(1);
        expect(jsonMock).toHaveBeenCalledWith(200, {
            clients: [
                {
                    name: 'name_1',
                    uuid: 'uuid_1',
                    serverName: 'server_A',
                },
                {
                    name: 'name_2',
                    uuid: 'uuid_2',
                    serverName: 'server_A',
                },
                {
                    name: 'name_3',
                    uuid: 'uuid_3',
                    serverName: 'server_A',
                },
            ],
            servers: ['server_A', 'server_B'],
        });
    });

    describe('POST /', () => {
        test('switches the client to a different server', () => {
            const extension = new SwitchServersByAPI();
            // @ts-expect-error mock
            extension.storage.clients = new Map(CLIENTS_MOCK);
            // @ts-expect-error mock
            extension.storage.routingServers = new Map(SERVERS_MOCK);
            expect(handlersPost.length).toBe(1);
            const sendMock = jest.fn();
            const jsonMock = jest.fn();
            // @ts-expect-error mock
            expect(handlersPost[0][0]).toBe('/');
            // @ts-expect-error mock
            handlersPost[0][1](
                {
                    body: {
                        clientUUID: 'uuid_1',
                        serverName: 'server_B',
                        servers: CLIENTS_MOCK_SERVERS,
                    },
                },
                { send: sendMock, json: jsonMock },
            );
            expect(jsonMock).not.toHaveBeenCalled();
            expect(sendMock).toHaveBeenCalledWith(200, 'ok');
            expect(changeServerMockClient1).toHaveBeenCalledWith(
                CLIENTS_MOCK_SERVERS['server_B'],
            );
            expect(changeServerMockClient3).not.toHaveBeenCalled();
            // @ts-expect-error mock
            handlersPost[0][1](
                { body: { clientUUID: 'uuid_3', serverName: 'server_A' } },
                { send: sendMock, json: jsonMock },
            );
            expect(changeServerMockClient3).toHaveBeenCalledWith({
                name: 'server_A',
            });
        });

        test('should validate the input - clientUUID is missing', () => {
            const extension = new SwitchServersByAPI();
            // @ts-expect-error mock
            extension.storage.clients = new Map(CLIENTS_MOCK);
            // @ts-expect-error mock
            extension.storage.routingServers = new Map(SERVERS_MOCK);
            expect(handlersPost.length).toBe(1);
            const sendMock = jest.fn();
            const jsonMock = jest.fn();
            // @ts-expect-error mock
            expect(handlersPost[0][0]).toBe('/');
            // @ts-expect-error mock
            handlersPost[0][1](
                {
                    body: {
                        serverName: 'server_B',
                        servers: CLIENTS_MOCK_SERVERS,
                    },
                },
                { send: sendMock, json: jsonMock },
            );
            expect(sendMock).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(404, {
                error: 'Client with such UUID does not exist.',
                clientUUID: undefined,
                availableClients: extension.getClientsArray(),
            });
            expect(changeServerMockClient1).not.toHaveBeenCalled();
        });
        test('should validate the input - serverName is missing', () => {
            const extension = new SwitchServersByAPI();
            // @ts-expect-error mock
            extension.storage.clients = new Map(CLIENTS_MOCK);
            // @ts-expect-error mock
            extension.storage.routingServers = new Map(SERVERS_MOCK);
            expect(handlersPost.length).toBe(1);
            const sendMock = jest.fn();
            const jsonMock = jest.fn();
            // @ts-expect-error mock
            expect(handlersPost[0][0]).toBe('/');
            // @ts-expect-error mock
            handlersPost[0][1](
                {
                    body: {
                        clientUUID: 'uuid_1',
                        servers: CLIENTS_MOCK_SERVERS,
                    },
                },
                { send: sendMock, json: jsonMock },
            );
            expect(sendMock).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(404, {
                error: 'Server does not exist.',
                serverName: undefined,
                availableServers: extension.getRoutingServersArray(),
            });
            expect(changeServerMockClient1).not.toHaveBeenCalled();
        });
        test('should validate the input - client with uuid=clientUUID does not exist', () => {
            const extension = new SwitchServersByAPI();
            // @ts-expect-error mock
            extension.storage.clients = new Map(CLIENTS_MOCK);
            // @ts-expect-error mock
            extension.storage.routingServers = new Map(SERVERS_MOCK);
            expect(handlersPost.length).toBe(1);
            const sendMock = jest.fn();
            const jsonMock = jest.fn();
            // @ts-expect-error mock
            expect(handlersPost[0][0]).toBe('/');
            // @ts-expect-error mock
            handlersPost[0][1](
                {
                    body: {
                        clientUUID: 'uuid_999',
                        serverName: 'server_B',
                        servers: CLIENTS_MOCK_SERVERS,
                    },
                },
                { send: sendMock, json: jsonMock },
            );
            expect(sendMock).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(404, {
                error: 'Client with such UUID does not exist.',
                clientUUID: 'uuid_999',
                availableClients: extension.getClientsArray(),
            });
            expect(changeServerMockClient1).not.toHaveBeenCalled();
        });
        test('should validate the input - server with name=serverName does not exist', () => {
            const extension = new SwitchServersByAPI();
            // @ts-expect-error mock
            extension.storage.clients = new Map(CLIENTS_MOCK);
            // @ts-expect-error mock
            extension.storage.routingServers = new Map(SERVERS_MOCK);
            expect(handlersPost.length).toBe(1);
            const sendMock = jest.fn();
            const jsonMock = jest.fn();
            // @ts-expect-error mock
            expect(handlersPost[0][0]).toBe('/');
            // @ts-expect-error mock
            handlersPost[0][1](
                {
                    body: {
                        serverName: 'server_F',
                        clientUUID: 'uuid_1',
                        servers: CLIENTS_MOCK_SERVERS,
                    },
                },
                { send: sendMock, json: jsonMock },
            );
            expect(sendMock).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(404, {
                error: 'Server does not exist.',
                serverName: 'server_F',
                availableServers: extension.getRoutingServersArray(),
            });
            expect(changeServerMockClient1).not.toHaveBeenCalled();
        });
        test('should handle error if client.changeServer fails', () => {
            const extension = new SwitchServersByAPI();
            // @ts-expect-error mock
            extension.storage.clients = new Map(CLIENTS_MOCK);
            // @ts-expect-error mock
            extension.storage.routingServers = new Map(SERVERS_MOCK);
            expect(handlersPost.length).toBe(1);
            const sendMock = jest.fn();
            const jsonMock = jest.fn();
            // @ts-expect-error mock
            expect(handlersPost[0][0]).toBe('/');
            changeServerMockClient1.mockImplementationOnce(() => {
                throw new Error('some error 123');
            });
            try {
                // @ts-expect-error mock
                handlersPost[0][1](
                    {
                        body: {
                            clientUUID: 'uuid_1',
                            serverName: 'server_B',
                            servers: CLIENTS_MOCK_SERVERS,
                        },
                    },
                    { send: sendMock, json: jsonMock },
                );
            } catch {
                //
            }
            expect(changeServerMockClient1).toHaveBeenCalledWith(
                CLIENTS_MOCK_SERVERS['server_B'],
            );
            expect(sendMock).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(500, {
                error: 'Failed to switch server.',
                clientUUID: 'uuid_1',
                clientName: 'name_1',
                fromServer: 'server_A',
                toServer: 'server_B',
            });
        });
    });

    test('recreateRoutingServersCache', () => {
        const extension = new SwitchServersByAPI();
        const servers = {
            server_C: { name: 'server_C' },
            server_D: { name: 'server_D' },
        };
        expect(!extension.storage.routingServers.has('server_C'));
        expect(!extension.storage.routingServers.has('server_D'));
        // @ts-expect-error mock
        extension.recreateRoutingServersCache(servers);
        expect(extension.storage.routingServers.get('server_C')).toBe(
            servers.server_C,
        );
        expect(extension.storage.routingServers.get('server_D')).toBe(
            servers.server_D,
        );
    });
});
