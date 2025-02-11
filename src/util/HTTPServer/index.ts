import { createServer, Server } from 'http';
import { Handler, IHTTPServer, Method, Response } from './types';

class HTTPServer implements IHTTPServer {
    handlers: Map<string, Handler<Method>>;
    server: Server;
    constructor() {
        this.handlers = new Map();
        this.server = createServer((req, res) => {
            const handleNotFound = () => response.send(404, 'Not Found');
            const response: Response = {
                res,
                json: (status, data) => {
                    res.writeHead(status, {
                        'Content-Type': 'application/json',
                    });
                    res.end(JSON.stringify(data));
                },
                send: (status, data) => {
                    res.writeHead(status, { 'Content-Type': 'text/plain' });
                    res.end(data);
                },
            };
            if (!req.url) return handleNotFound();
            const reqUrl = new URL(req.url, `http://${req.headers.host}`);
            const path = reqUrl.pathname;
            const handler = this.handlers.get(`${req.method} ${path}`);
            if (!handler) return handleNotFound();
            if (req.method === 'GET') {
                handler(
                    {
                        req,
                        method: 'GET',
                    },
                    response,
                );
                return;
            } else if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => {
                    body += chunk;
                });
                req.on('end', () => {
                    let parsedBody: Record<string, string> = {};
                    try {
                        Object.entries(JSON.parse(body)).forEach(
                            ([key, value]) => (parsedBody[key] = value + ''),
                        );
                    } catch {
                        response.json(500, {
                            error: 'Body in not a valid JSON.',
                        });
                        return;
                    }
                    handler(
                        {
                            req,
                            body: parsedBody,
                            method: 'POST',
                        },
                        response,
                    );
                });
            } else {
                handleNotFound();
            }
        });
    }

    protected request(method: Method, path: string, handler: Handler<Method>) {
        this.handlers.set(`${method} ${path}`, handler);
    }

    get(path: string, handler: Handler<'GET'>) {
        this.request('GET', path, handler);
    }

    post(path: string, handler: Handler<'POST'>) {
        this.request('POST', path, handler);
    }

    listen(port: number, host: string, callback: () => void) {
        this.server.listen(port, host, callback);
        return this;
    }

    close(callback?: (err?: Error) => void) {
        this.server.close(callback);
    }
}

export default HTTPServer;
