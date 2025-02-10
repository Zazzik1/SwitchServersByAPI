import Client from 'dimensions/client';
import { Extension } from 'dimensions/extension';
import TerrariaServer from 'dimensions/terrariaserver';
import express, { Application } from 'express';
import config from './config';

class SwitchServersByAPI implements Extension {
    name: string;
    version: string;
    author: string;
    reloadable: boolean;
    clients: Map<string, Client>;
    server?: ReturnType<Application['listen']>;
    constructor() {
        this.name = 'SwitchServersByAPI';
        this.version = 'v1.0.2';
        this.author = 'Zazzik1';
        this.reloadable = false;
        this.clients = new Map();

        this.start();

        process.on('SIGTERM', this.stop.bind(this));
        process.on('SIGINT', this.stop.bind(this));
    }

    getClientsArray() {
        return [...this.clients.values()].map((client) => ({
            uuid: client.UUID,
            name: client.getName(),
            serverName: client.server.name,
        }));
    }

    protected log(...text: string[]) {
        console.log(`[Extension] ${this.name}: `, ...text);
    }

    start() {
        const app = express();
        app.use(express.json());
        app.get('/', async (_req, res) => {
            const values = [...this.clients.values()];
            const servers = values.length ? Object.keys(values[0].servers) : [];
            res.json({ servers, clients: this.getClientsArray() });
        });
        app.post('/', async (req, res) => {
            const { clientUUID, serverName } = req.body;
            if (!this.clients.has(clientUUID)) {
                res.status(404).json({
                    error: 'Client with such UUID does not exist.',
                    clientUUID,
                    availableClients: this.getClientsArray(),
                });
                return;
            }
            const client = this.clients.get(clientUUID)!;
            const servers = Object.keys(client.servers);
            if (!servers.includes(serverName)) {
                res.status(404).json({
                    error: 'Server does not exist.',
                    serverName,
                    availableServers: servers,
                });
                return;
            }
            try {
                client.changeServer(client.servers[serverName]);
            } catch (err) {
                res.status(500).send({
                    error: 'Failed to switch server.',
                    clientUUID: client.UUID,
                    clientName: client.getName(),
                    fromServer: client.server.name,
                    toServer: serverName,
                });
                return;
            }
            if (config.verbosity >= 2)
                this.log(
                    `Client with UUID "${clientUUID}" has been switched from "${client.server.name}" to "${serverName}".`,
                );
            res.sendStatus(200);
        });
        this.server = app.listen(config.port, '0.0.0.0', () => {
            if (config.verbosity >= 1)
                this.log(
                    `The API server is listening on http://127.0.0.1:${config.port}`,
                );
        });
    }

    stop() {
        if (this.server) {
            if (config.verbosity >= 1)
                this.log('The API server has been closed.');
        }
        this.server?.close();
    }

    clientFullyConnectedHandler(client: Client) {
        this.clients.set(client.UUID, client);
        if (config.verbosity >= 2)
            this.log(`Client with UUID "${client.UUID}" has connected.`);
    }

    serverDisconnectHandler(server: TerrariaServer) {
        this.clients.delete(server.client.UUID);
        if (config.verbosity >= 2)
            this.log(
                `Client with UUID "${server.client.UUID}" has disconnected.`,
            );
        return false;
    }
}

export default SwitchServersByAPI;
