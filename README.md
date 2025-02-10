# SwitchServersByAPI

![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FZazzik1%2FSwitchServersByAPI%2Frefs%2Fheads%2Fmaster%2Fpackage.json&query=%24.version&prefix=v&label=Version)
[![Node.js CI](https://github.com/Zazzik1/SwitchServersByAPI/actions/workflows/ci.yml/badge.svg)](https://github.com/Zazzik1/SwitchServersByAPI/actions/workflows/ci.yml)
![Latest Release](https://img.shields.io/github/release-date/Zazzik1/SwitchServersByAPI)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/Zazzik1/SwitchServersByAPI/total)

An extension for [Dimensions](https://github.com/popstarfreas/Dimensions), adding an API to easily switch players to different servers using external services.

## How to install?

1. Unpack the release downloaded from Dimensions
2. Download and unpack this extension downloaded from releases
3. Put the extension in `<Dimensions root>/build/extensions/` directory
4. Run `npm install express` inside the Dimensions directory. It is a required dependency.

## Configuration
Edit the `config.js` file to update the following settings:
- `port` - The port on which the API server listens for incoming requests.
- `verbosity` - Accepts values 0, 1, or 2. Controls the level of logging detail the extension provides.

## Available endpoints

### POST /
Switches the client to a server with a provided name.

Parameters:
- `clientUUID` - required
- `serverName` - required

Example request:
```sh
curl -X POST -d "serverName=server2&clientUUID=6c3577e1-0727-4b8c-92b4-ea28953dda39" "http://127.0.0.1:3000"
```

### GET /
Returns information about clients and servers.


Example request:
```sh
curl "http://127.0.0.1:3000"
```

Example response:
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
