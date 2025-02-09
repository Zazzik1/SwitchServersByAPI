import SwitchServersByAPI from '../index';
import packageJson from '../../package.json';
import config from '../config';

const closeServerMock = jest.fn();
const listenMock = jest.fn().mockReturnValue({ close: closeServerMock });
let handlersGet: unknown[] = [];
let handlersPost: unknown[] = [];
const changeServerMockClient1 = jest.fn();
const changeServerMockClient2 = jest.fn();
const changeServerMockClient3 = jest.fn();

jest.mock('express', () => {
    return Object.assign(
        jest.fn(() => ({
            use: jest.fn(),
            get: jest
                .fn()
                .mockImplementation((...args) => handlersGet.push(args)),
            post: jest
                .fn()
                .mockImplementation((...args) => handlersPost.push(args)),
            listen: listenMock,
        })),
        {
            json: jest.fn(),
        },
    );
});

const SERVERS_MOCK = Object.freeze({ serverA: {}, serverB: {} });

const CLIENTS_MOCK = Object.freeze([
    [
        'uuid_1',
        {
            getName: () => 'name_1',
            UUID: 'uuid_1',
            changeServer: changeServerMockClient1,
            servers: SERVERS_MOCK,
        },
    ],
    [
        'uuid_2',
        {
            getName: () => 'name_2',
            UUID: 'uuid_2',
            changeServer: changeServerMockClient2,
            servers: SERVERS_MOCK,
        },
    ],
    [
        'uuid_3',
        {
            getName: () => 'name_3',
            UUID: 'uuid_3',
            changeServer: changeServerMockClient3,
            servers: SERVERS_MOCK,
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
        expect(extension.reloadable).toBe(false);
    });
    test('the API server should start listening when object is constructed', () => {
        expect(listenMock).not.toHaveBeenCalled();
        new SwitchServersByAPI();
        expect(listenMock).toHaveBeenCalledTimes(1);
        expect(listenMock).toHaveBeenCalledWith(
            config.port,
            '0.0.0.0',
            expect.anything(),
        );
    });
    test('the API server should stop listening when stop method is called', () => {
        const extension = new SwitchServersByAPI();
        extension.stop();
        expect(closeServerMock).toHaveBeenCalled();
    });
    test('getClientsArray', () => {
        const extension = new SwitchServersByAPI();
        // @ts-expect-error mock
        extension.clients = new Map(CLIENTS_MOCK);
        expect(extension.getClientsArray()).toStrictEqual([
            {
                name: 'name_1',
                uuid: 'uuid_1',
            },
            {
                name: 'name_2',
                uuid: 'uuid_2',
            },
            {
                name: 'name_3',
                uuid: 'uuid_3',
            },
        ]);
    });

    test('clientFullyConnectedHandler adds the client to the map', () => {
        const extension = new SwitchServersByAPI();
        expect(extension.clients).toStrictEqual(new Map());
        // @ts-expect-error mock
        extension.clientFullyConnectedHandler({ UUID: 'client_uuid' });
        expect(extension.clients.get('client_uuid')).toStrictEqual({
            UUID: 'client_uuid',
        });
    });

    test('serverDisconnectHandler removes the client from the map', () => {
        const extension = new SwitchServersByAPI();
        // @ts-expect-error mock
        extension.clients = new Map(CLIENTS_MOCK);
        // @ts-expect-error mock
        extension.serverDisconnectHandler({ client: { UUID: 'uuid_2' } });
        expect(extension.clients.get('uuid_1')).toStrictEqual({
            UUID: 'uuid_1',
            servers: SERVERS_MOCK,
            getName: expect.anything(),
            changeServer: expect.anything(),
        });
        expect(extension.clients.has('uuid_2')).toBe(false);
        expect(extension.clients.get('uuid_3')).toStrictEqual({
            UUID: 'uuid_3',
            servers: SERVERS_MOCK,
            getName: expect.anything(),
            changeServer: expect.anything(),
        });
    });
    test('GET / returns a list of clients and servers', () => {
        expect(handlersGet.length).toBe(0);
        const extension = new SwitchServersByAPI();
        expect(handlersGet.length).toBe(1);
        // @ts-expect-error mock
        expect(handlersGet[0][0]).toBe('/');
        const jsonMock = jest.fn();
        // @ts-expect-error mock
        handlersGet[0][1]({}, { json: jsonMock });
        expect(jsonMock).toHaveBeenCalledTimes(1);
        expect(jsonMock).toHaveBeenCalledWith({
            clients: [],
            servers: [],
        });
        jsonMock.mockClear();
        // @ts-expect-error mock
        extension.clients = new Map(CLIENTS_MOCK);
        // @ts-expect-error mock
        handlersGet[0][1]({}, { json: jsonMock });
        expect(jsonMock).toHaveBeenCalledTimes(1);
        expect(jsonMock).toHaveBeenCalledWith({
            clients: [
                {
                    name: 'name_1',
                    uuid: 'uuid_1',
                },
                {
                    name: 'name_2',
                    uuid: 'uuid_2',
                },
                {
                    name: 'name_3',
                    uuid: 'uuid_3',
                },
            ],
            servers: ['serverA', 'serverB'],
        });
    });
    test('POST / switches the client to a different the server', () => {
        expect(handlersPost.length).toBe(0);
        const extension = new SwitchServersByAPI();
        // @ts-expect-error mock
        extension.clients = new Map(CLIENTS_MOCK);
        expect(handlersPost.length).toBe(1);
        const sendStatusMock = jest.fn();
        // @ts-expect-error mock
        expect(handlersPost[0][0]).toBe('/');
        // @ts-expect-error mock
        handlersPost[0][1](
            { body: { clientUUID: 'uuid_1', serverName: 'serverB' } },
            { sendStatus: sendStatusMock },
        );
        expect(sendStatusMock).toHaveBeenCalledWith(200);
        expect(changeServerMockClient1).toHaveBeenCalledWith(
            SERVERS_MOCK['serverB'],
        );
        expect(changeServerMockClient3).not.toHaveBeenCalled();
        // @ts-expect-error mock
        handlersPost[0][1](
            { body: { clientUUID: 'uuid_3', serverName: 'serverA' } },
            { sendStatus: sendStatusMock },
        );
        expect(changeServerMockClient3).toHaveBeenCalledWith(
            SERVERS_MOCK['serverA'],
        );
    });
});
