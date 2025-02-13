import Client from 'dimensions/client';
import TerrariaServer from 'dimensions/terrariaserver';
import { Extension } from 'dimensions/extension';
import ListenServer from 'dimensions/listenserver';
import RoutingServer from 'dimensions/routingserver';

import HTTPServer from './util/HTTPServer';
import ConfigLoader from './util/ConfigLoader';
import { UserConfig, Verbosity } from './util/ConfigLoader/types';
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
    listenServers?: Record<string, ListenServer>;

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
     * This method is called only when the extension is loaded by Dimensions
     * after previously being stopped using the `unload` method. Because of it,
     * it should not call the `startAPIServer` and this method should be called in
     * the constructor instead.
     */
    load(storage: ExtensionStorage): void {
        this.storage = storage;
    }

    /**
     * This method is called when the extension is supposed to stop working.
     * - stops API server
     * - saves the storage to Dimensions
     * The saved storage is loaded again using `load` method when
     * the Dimensions loads the extension again.
     */
    unload(): ExtensionStorage {
        this.stopAPIServer();
        return this.storage;
    }

    /**
     * Dynamically reloads config (for CLI).
     * This method should not reset storage to default state.
     */
    reload(): void {
        this.stopAPIServer(() => {
            const { userConfig } = ConfigLoader.load();
            this.config = userConfig;
            this.startAPIServer();
        });
    }

    /** Returns an array of clients for API responses. */
    getClientsArray(): ClientsArray {
        return [...this.storage.clients.values()].map((client) => ({
            uuid: client.UUID,
            name: client.getName(),
            serverName: client.server.name,
        }));
    }

    /** Returns an array of routing servers for API responses. */
    getRoutingServersArray(): RoutingServersArray {
        return [...this.storage.routingServers.values()].map(
            (server) => server.name,
        );
    }

    updateStorage() {
        const newRoutingServers = new Map();
        const newClients = new Map();
        for (const listenServer of Object.values(this.listenServers ?? {})) {
            const routingServers = Object.values(listenServer.servers);
            for (const routingServer of routingServers) {
                newRoutingServers.set(routingServer.name, routingServer);
            }
            for (const client of listenServer.clients) {
                this.storage.clients.set(client.UUID, client);
            }
        }
        this.storage.routingServers = newRoutingServers;
        this.storage.clients = newClients;
    }

    /** This method is called after the extension is loaded. */
    setListenServers(servers: Record<string, ListenServer>): void {
        this.listenServers = servers;
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
    }): void {
        if (this.config.verbosity < level) return;
        this.logging.info(`[Extension] ${this.name}: ${message}`);
        if (submessage) this.logging.info(submessage);
    }

    /** Starts the API server. */
    startAPIServer(callback?: () => void): void {
        this.server = new HTTPServer();
        if (!this.config.disabledEndpoints['/'].GET)
            this.server.get('/', async (_req, res) => {
                this.updateStorage();
                res.json(200, {
                    servers: this.getRoutingServersArray(),
                    clients: this.getClientsArray(),
                });
            });
        if (!this.config.disabledEndpoints['/'].POST)
            this.server.post('/', async (req, res) => {
                this.updateStorage();
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
    stopAPIServer(callback?: () => void): void {
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

    /** Called when new client connects. */
    clientFullyConnectedHandler(client: Client): void {
        this.log({
            level: Verbosity.VERBOSE,
            message: `Client with UUID "${client.UUID}" has connected.`,
        });
    }

    /** Called when client disconnects. */
    serverDisconnectHandler(server: TerrariaServer): boolean {
        this.log({
            level: Verbosity.VERBOSE,
            message: `Client with UUID "${server.client.UUID}" has disconnected.`,
        });
        return false;
    }
}

export default SwitchServersByAPI;
