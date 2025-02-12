import EventEmitter from 'events';
import HTTPServer from '../../util/HTTPServer';
import { POSTRequest } from '../../util/HTTPServer/types';
import http from 'http';

jest.mock('http', () => ({
    createServer: jest.fn(),
}));

const createServerMock = http.createServer;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('HTTPServer', () => {
    test('should instantiate', () => {
        const server = new HTTPServer();
        expect(server.server).toBe(createServerMock());
    });

    test('createController should work for POST requests', () => {});

    test('get method adds a GET handler', () => {
        const server = new HTTPServer();
        const path = '/my_custom_path';
        const handler = () => {};
        server.get(path, handler);
        expect(server.handlers.get(`GET ${path}`)).toBe(handler);
    });

    test('post method adds a POST handler', () => {
        const server = new HTTPServer();
        const path = '/my_custom_path';
        const handler = () => {};
        server.post(path, handler);
        expect(server.handlers.get(`POST ${path}`)).toBe(handler);
    });

    test('listen method calls server.listen with provided parameters', () => {
        // @ts-expect-error mock
        createServerMock.mockReturnValue({
            listen: jest.fn(),
        });
        const server = new HTTPServer();
        const callback = () => {};
        server.listen(9999, '192.168.1.100', callback);
        expect(server.server.listen).toHaveBeenCalledWith(
            9999,
            '192.168.1.100',
            callback,
        );
    });

    test('close method calls server.close with provided parameters', () => {
        // @ts-expect-error mock
        createServerMock.mockReturnValue({
            close: jest.fn(),
        });
        const server = new HTTPServer();
        const callback = () => {};
        server.close(callback);
        expect(server.server.close).toHaveBeenCalledWith(callback);
    });

    describe('createController', () => {
        const HEADERS = Object.freeze({
            host: 'example.com',
        });
        test('res.json() works as expected', () => {
            const req = {
                method: 'GET',
                url: 'http://example.com/custom_path',
                headers: HEADERS,
            };
            const FAKE_STATUS = 99999;
            const res = {
                writeHead: jest.fn(),
                end: jest.fn(),
            };
            const server = new HTTPServer();
            server.handlers.set('GET /custom_path', (req, res) => {
                res.json(FAKE_STATUS, {
                    foo: 'bar',
                });
            });
            const controller = server.createController();
            // @ts-expect-error mock
            controller(req, res);
            expect(res.writeHead).toHaveBeenLastCalledWith(FAKE_STATUS, {
                'Content-Type': 'application/json',
            });
            expect(res.end).toHaveBeenCalledWith(
                JSON.stringify({ foo: 'bar' }),
            );
        });
        test('res.send() works as expected', () => {
            const req = {
                method: 'GET',
                url: 'http://example.com/another_path',
                headers: HEADERS,
            };
            const FAKE_STATUS = 88888;
            const res = {
                writeHead: jest.fn(),
                end: jest.fn(),
            };
            const server = new HTTPServer();
            server.handlers.set('GET /another_path', (req, res) => {
                res.send(FAKE_STATUS, 'example_response');
            });
            const controller = server.createController();
            // @ts-expect-error mock
            controller(req, res);
            expect(res.writeHead).toHaveBeenLastCalledWith(FAKE_STATUS, {
                'Content-Type': 'text/plain',
            });
            expect(res.end).toHaveBeenCalledWith('example_response');
        });
        test('handles 404 Not Found on not existing paths', () => {
            const server = new HTTPServer();
            const req = {
                method: 'GET',
                url: 'http://example.com/abcdef',
                headers: HEADERS,
            };
            const res = {
                writeHead: jest.fn(),
                end: jest.fn(),
            };
            const controller = server.createController();
            expect(!server.handlers.has('/abcdef'));
            // @ts-expect-error mock
            controller(req, res);
            expect(res.writeHead).toHaveBeenCalledWith(404, {
                'Content-Type': 'text/plain',
            });
            expect(res.end).toHaveBeenCalledWith('Not Found');
        });
        test('handles 404 Not Found if req.url is missing', () => {
            const server = new HTTPServer();
            const req = {
                method: 'GET',
                headers: HEADERS,
            };
            const res = {
                writeHead: jest.fn(),
                end: jest.fn(),
            };
            const controller = server.createController();
            // @ts-expect-error mock
            controller(req, res);
            expect(res.writeHead).toHaveBeenCalledWith(404, {
                'Content-Type': 'text/plain',
            });
            expect(res.end).toHaveBeenCalledWith('Not Found');
        });
        test('POST request handlers have access to req.body', (done) => {
            const server = new HTTPServer();
            const eventEmitter = new EventEmitter();
            const req = {
                method: 'POST',
                url: 'http://example.com/abcdef',
                headers: HEADERS,
                on: eventEmitter.on.bind(eventEmitter),
            };
            const res = {
                writeHead: jest.fn(),
                end: jest.fn(),
            };
            const controller = server.createController();
            const fullBodyStr = JSON.stringify({
                hello: 'test123',
            });
            server.handlers.set('POST /abcdef', (req) => {
                expect((req as POSTRequest).body).toStrictEqual(
                    JSON.parse(fullBodyStr),
                );
                done();
            });
            // @ts-expect-error mock
            controller(req, res);
            eventEmitter.emit('data', fullBodyStr.slice(0, 4));
            eventEmitter.emit('data', fullBodyStr.slice(4, 8));
            eventEmitter.emit('data', fullBodyStr.slice(8));
            eventEmitter.emit('end');
        });
        test('POST request returns status 500 if body is not a valid JSON', () => {
            const server = new HTTPServer();
            const eventEmitter = new EventEmitter();
            const req = {
                method: 'POST',
                url: 'http://example.com/abcdef',
                headers: HEADERS,
                on: eventEmitter.on.bind(eventEmitter),
            };
            const res = {
                writeHead: jest.fn(),
                end: jest.fn(),
            };
            const controller = server.createController();
            server.handlers.set('POST /abcdef', () => {});
            // @ts-expect-error mock
            controller(req, res);
            const fullBodyStr = 'definitely not a valid JSON';
            eventEmitter.emit('data', fullBodyStr);
            eventEmitter.emit('end');
            expect(res.writeHead).toHaveBeenCalledWith(500, {
                'Content-Type': 'application/json',
            });
            expect(res.end).toHaveBeenCalledWith(
                JSON.stringify({
                    error: 'Body in not a valid JSON.',
                }),
            );
        });
        test('returns 404 for not supported methods', () => {
            const server = new HTTPServer();
            const req = {
                method: 'DELETE',
                url: 'http://example.com/abcdef',
                headers: HEADERS,
            };
            const res = {
                writeHead: jest.fn(),
                end: jest.fn(),
            };
            const controller = server.createController();
            server.handlers.set('DELETE /abcdef', (req, res) => {
                res.send(200, 'example_response');
            });
            // @ts-expect-error mock
            controller(req, res);
            expect(res.writeHead).toHaveBeenCalledWith(404, {
                'Content-Type': 'text/plain',
            });
            expect(res.end).toHaveBeenCalledWith('Not Found');
        });
    });
});
