import Client from 'dimensions/client';
import TerrariaServer from 'dimensions/terrariaserver';
import { Extension } from 'dimensions/extension';
import HTTPServer from './util/HTTPServer';
import ConfigLoader from './util/ConfigLoader';
import { UserConfig, Verbosity } from './util/ConfigLoader/types';
import RoutingServer from 'dimensions/routingserver';
import defaultLogging, { Logging } from './util/logging';

type ClientsArray = { uuid: string; name: string; serverName: string }[];
type RoutingServersArray = string[];
type ExtensionStorage = {
    clients: Map<string, Client>;
    routingServers: Map<string, RoutingServer>;
};

class SwitchServersByAPI implements Extension<ExtensionStorage> {
    name: string;
    version: string;
    author: string;
    githubUrl: string;
    reloadable: boolean;
    reloadName: string;
    server?: HTTPServer;
    config: UserConfig;
    logging: Logging;
    storage: ExtensionStorage;

    constructor(logging: Logging = defaultLogging) {
        const { userConfig, packageConfig } = ConfigLoader.load();
        this.logging = logging;
        this.config = userConfig;
        this.name = packageConfig.name;
        this.version = `v${packageConfig.version}`;
        this.author = packageConfig.author;
        this.githubUrl = packageConfig.githubUrl;
        this.reloadable = true;
        this.reloadName = 'reload_switch_servers_by_api';
        this.storage = {
            clients: new Map(),
            routingServers: new Map(),
        }; // required for reloading

        // TODO: remove when Dimensions implements a cleanup function.
        process.on('SIGTERM', () => this.stopAPIServer());
        process.on('SIGINT', () => this.stopAPIServer());

        this.startAPIServer();
    }

    /**
     * Loads temporary data if exist.
     * This method is called when the extension is reloaded by Dimensions.
     */
    load(storage: ExtensionStorage) {
        this.storage = storage;
    }

    /**
     * Stops API server and saves temporary data.
     * This data is stored until the Dimensions loads the extension again.
     */
    unload(): ExtensionStorage {
        this.stopAPIServer();
        return this.storage;
    }

    /** Reload dynamically through CLI. */
    reload() {
        this.stopAPIServer(() => {
            const { userConfig } = ConfigLoader.load();
            this.config = userConfig;
            this.storage = {
                clients: new Map(),
                routingServers: new Map(),
            };
            this.startAPIServer();
        });
    }

    /** Returns an array of clients in format for GET requests. */
    getClientsArray(): ClientsArray {
        return [...this.storage.clients.values()].map((client) => ({
            uuid: client.UUID,
            name: client.getName(),
            serverName: client.server.name,
        }));
    }

    /** Returns an array of routing servers in format for GET requests. */
    getRoutingServersArray(): RoutingServersArray {
        return [...this.storage.routingServers.values()].map(
            (server) => server.name,
        );
    }

    /** Logs the provided message to stdout if the verbosity set in config is at least `level`. */
    log({
        level = Verbosity.NORMAL,
        message,
        submessage,
    }: {
        level?: Verbosity;
        message: string;
        submessage?: string;
    }) {
        if (this.config.verbosity < level) return;
        this.logging.info(`[Extension] ${this.name}: ${message}`);
        if (submessage) this.logging.info(submessage);
    }

    /** Starts the API server. */
    startAPIServer(callback?: () => void) {
        this.server = new HTTPServer();
        if (!this.config.disabledEndpoints['/'].GET)
            this.server.get('/', async (_req, res) => {
                res.json(200, {
                    servers: this.getRoutingServersArray(),
                    clients: this.getClientsArray(),
                });
            });
        if (!this.config.disabledEndpoints['/'].POST)
            this.server.post('/', async (req, res) => {
                const { clientUUID, serverName } = req.body;
                if (
                    clientUUID == null ||
                    !this.storage.clients.has(clientUUID)
                ) {
                    res.json(404, {
                        error: 'Client with such UUID does not exist.',
                        clientUUID,
                        availableClients: this.getClientsArray(),
                    });
                    return;
                }
                const client = this.storage.clients.get(clientUUID)!;
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
                } catch {
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
            callback?.();
        });
    }

    /** Stops the API server. */
    stopAPIServer(callback?: () => void) {
        if (!this.server) return callback?.();
        this.log({
            message: 'The API server is now shutting down.',
        });
        this.server.close((error) => {
            if (error)
                this.log({
                    message: `Failed to stop the API server. ${error}`,
                });
            this.log({
                message: 'The API server has been shut down. Goodbye! ✨🔌',
            });
            callback?.();
        });
    }

    recreateRoutingServersCache(routingServers: Client['servers']) {
        // It's important to recreate routingServers and not cache it for too long,
        // because it is not guaranteed that the server list
        // will be constant for the entire lifecycle of the Dimensions.
        const servers: Map<string, RoutingServer> = new Map();
        Object.values(routingServers).forEach((server) => {
            servers.set(server.name, server);
        });
        this.storage.routingServers = servers;
    }

    /** Called when new client connects. */
    clientFullyConnectedHandler(client: Client) {
        this.storage.clients.set(client.UUID, client);
        this.recreateRoutingServersCache(client.servers);
        this.log({
            level: Verbosity.VERBOSE,
            message: `Client with UUID "${client.UUID}" has connected.`,
        });
    }

    /** Called when client disconnects. */
    serverDisconnectHandler(server: TerrariaServer) {
        this.storage.clients.delete(server.client.UUID);
        this.recreateRoutingServersCache(server.client.servers);
        this.log({
            level: Verbosity.VERBOSE,
            message: `Client with UUID "${server.client.UUID}" has disconnected.`,
        });
        return false;
    }
}

export default SwitchServersByAPI;
