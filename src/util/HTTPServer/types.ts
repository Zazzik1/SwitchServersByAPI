import { IncomingMessage, ServerResponse } from 'http';

export type GETRequest = { method: 'GET'; req: IncomingMessage };
export type POSTRequest = {
    method: 'POST';
    // For the same of simplicity we assume there are no nested objects in body.
    body: Record<string, string | undefined>;
    req: IncomingMessage;
};

export type Method = 'GET' | 'POST';
export type Request<M extends Method> = M extends 'GET'
    ? GETRequest
    : POSTRequest;

export type Response = {
    json: (status: number, data: Record<string, unknown>) => void;
    send: (status: number, data: string) => void;
    res: ServerResponse;
};

export type Handler<M extends Method> = (
    req: Request<M>,
    res: Response,
) => void;

export interface IHTTPServer {
    get: (path: string, handler: Handler<'GET'>) => void;
    post: (path: string, handler: Handler<'POST'>) => void;
    listen: (port: number, host: string, callback: () => void) => IHTTPServer;
    close: (callback?: (err?: Error) => void) => void;
}
