# SwitchServersByAPI

![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FZazzik1%2FSwitchServersByAPI%2Frefs%2Fheads%2Fmaster%2Fpackage.json&query=%24.version&prefix=v&label=Version)
[![CI Build](https://github.com/Zazzik1/SwitchServersByAPI/actions/workflows/ci.yml/badge.svg)](https://github.com/Zazzik1/SwitchServersByAPI/actions/workflows/ci.yml)
![Latest Release](https://img.shields.io/github/release-date/Zazzik1/SwitchServersByAPI)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/Zazzik1/SwitchServersByAPI/total)

An extension for [Dimensions](https://github.com/popstarfreas/Dimensions), adding an API to easily switch players to different servers using external services.

## How to install

1. Download the Dimensions from [popstarfreas/Dimensions/releases](https://github.com/popstarfreas/Dimensions/releases)
2. Download this extension from [Zazzik1/SwitchServersByAPI/releases](https://github.com/Zazzik1/SwitchServersByAPI/releases)
3. Put the unpacked extension in `<Dimensions root>/build/extensions/` directory

The directory structure should look like this:
```
<Dimensions root>/
|-- build/
|   |-- node_modules/
|   |-- extensions/
|       |-- SwitchServersByAPI_1.0.x/
|           |-- index.js
|           |-- config.json
...
```
## Configuration
Edit the `config.json` file to update the following settings:
- `port` - The port on which the API server listens for incoming requests.
- `verbosity` - Accepts values 0, 1, or 2. Controls the level of logging detail the extension provides.
- `disabledEndpoints` - If a given endpoint is set to `true`, it will be disabled and not available through the API.

## Available endpoints

### POST /
_Switches the client to a server with name described by a `serverName` parameter._

**Note:** Currenlty, the API server does not validate the `Content-Type` header. It expects all incoming data to be in JSON, so sending data in formats like `form-data` or `x-www-form-urlencoded` will not work as expected.

**Parameters:**
- `clientUUID` - required
- `serverName` - required

**Example request:**
```sh
curl -X POST -d '{"serverName": "server_B", "clientUUID": "6c3577e1-0727-4b8c-92b4-ea28953dda39"}' "http://127.0.0.1:3000"
```

### GET /
_Returns information about clients and servers._

**Note:** The information about servers is updated whenever a client connects or disconnects and becomes available in the API only after at least one client has connected.

**Example request:**
```sh
curl "http://127.0.0.1:3000"
```

**Example response:**
```json
{
    "servers": [
        "server_A",
        "server_B"
    ],
    "clients": [
        {
            "uuid": "6c3577e1-0727-4b8c-92b4-ea28953dda39",
            "name": "Zazzik1",
            "serverName": "server_A"
        }
    ]
}
```
