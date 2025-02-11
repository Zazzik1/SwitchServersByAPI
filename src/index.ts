import Client from 'dimensions/client';
import { Extension } from 'dimensions/extension';
import TerrariaServer from 'dimensions/terrariaserver';
import HTTPServer from './util/HTTPServer';
import ConfigLoader from './util/ConfigLoader';
import { UserConfig, Verbosity } from './util/ConfigLoader/types';

class SwitchServersByAPI implements Extension {
    name: string;
    version: string;
    author: string;
    githubUrl: string;
    reloadable: boolean;
    clients: Map<string, Client>;
    server?: HTTPServer;
    config: UserConfig;

    constructor() {
        const { userConfig, packageConfig } = ConfigLoader.load();
        this.config = userConfig;
        this.name = packageConfig.name;
        this.version = `v${packageConfig.version}`;
        this.author = packageConfig.author;
        this.githubUrl = packageConfig.githubUrl;
        this.reloadable = false;
        this.clients = new Map();

        this.startAPIServer();

        process.on('SIGTERM', this.stopAPIServer.bind(this));
        process.on('SIGINT', this.stopAPIServer.bind(this));
    }

    getClientsArray() {
        return [...this.clients.values()].map((client) => ({
            uuid: client.UUID,
            name: client.getName(),
            serverName: client.server.name,
        }));
    }

    /** Logs the provided message to stdout if the verbosity set in config is at least `level`. */
    protected log({
        level = Verbosity.NORMAL,
        message,
        submessage,
    }: {
        level?: Verbosity;
        message: string;
        submessage?: string;
    }) {
        if (this.config.verbosity < level) return;
        console.log(`[Extension] ${this.name}:`, message);
        if (submessage) console.log(submessage);
    }

    /** Starts the API server. */
    startAPIServer() {
        this.server = new HTTPServer();
        if (!this.config.disabledEndpoints['/'].GET)
            this.server.get('/', async (_req, res) => {
                const values = [...this.clients.values()];
                const servers = values.length
                    ? Object.keys(values[0].servers)
                    : [];
                res.json(200, { servers, clients: this.getClientsArray() });
            });
        if (!this.config.disabledEndpoints['/'].POST)
            this.server.post('/', async (req, res) => {
                const { clientUUID, serverName } = req.body;
                if (clientUUID == null || !this.clients.has(clientUUID)) {
                    res.json(404, {
                        error: 'Client with such UUID does not exist.',
                        clientUUID,
                        availableClients: this.getClientsArray(),
                    });
                    return;
                }
                const client = this.clients.get(clientUUID)!;
                const servers = Object.keys(client.servers);
                if (serverName == null || !servers.includes(serverName)) {
                    res.json(404, {
                        error: 'Server does not exist.',
                        serverName,
                        availableServers: servers,
                    });
                    return;
                }
                try {
                    client.changeServer(client.servers[serverName]);
                } catch (err) {
                    res.json(500, {
                        error: 'Failed to switch server.',
                        clientUUID: client.UUID,
                        clientName: client.getName(),
                        fromServer: client.server.name,
                        toServer: serverName,
                    });
                    return;
                }
                this.log({
                    level: Verbosity.VERBOSE,
                    message: `Client with UUID "${clientUUID}" has been switched from "${client.server.name}" to "${serverName}".`,
                });
                res.send(200, 'ok');
            });
        this.server.listen(this.config.port, '0.0.0.0', () => {
            this.log({
                message: `The API server is now live at http://127.0.0.1:${this.config.port} ✅`,
                submessage: `🌟 Check out the project on GitHub for updates: ${this.githubUrl}`,
            });
        });
    }

    /** Stops the API server. */
    stopAPIServer() {
        this.log({
            message: 'The API server is now shutting down.',
        });
        this.server?.close((error) => {
            if (error)
                return this.log({
                    message: `Failed to stop the API server. ${error}`,
                });
            this.log({
                message: 'The API server has been shut down. Goodbye! ✨🔌',
            });
        });
    }

    /** Called when new client connects. */
    clientFullyConnectedHandler(client: Client) {
        this.clients.set(client.UUID, client);
        this.log({
            level: Verbosity.VERBOSE,
            message: `Client with UUID "${client.UUID}" has connected.`,
        });
    }

    /** Called when client disconnects. */
    serverDisconnectHandler(server: TerrariaServer) {
        this.clients.delete(server.client.UUID);
        this.log({
            level: Verbosity.VERBOSE,
            message: `Client with UUID "${server.client.UUID}" has disconnected.`,
        });
        return false;
    }
}

export default SwitchServersByAPI;
