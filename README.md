# SwitchServersByAPI

An extension for [Dimensions](https://github.com/popstarfreas/Dimensions), adding an API to easily switch players to different servers using external services.

## How to install?

1. Unpack the release downloaded from Dimensions
2. Download and unpack this extension downloaded from releases
3. Put the extension in `<Dimensions root>/build/extensions/` directory
4. Run `npm install express` inside the Dimensions directory. It is a required dependency.

## Example of use

1. Switching the servers
```sh
curl -X POST -d "serverName=server2&clientUUID=6c3577e1-0727-4b8c-92b4-ea28953dda39" "http://127.0.0.1:3000"
```

2. Getting information about clients and servers
```sh
curl "http://127.0.0.1:3000"
```
Response:
```json
{
    "servers": [
        "server1",
        "server2"
    ],
    "clients": [
        {
            "uuid": "6c3577e1-0727-4b8c-92b4-ea28953dda39",
            "name": "Zazzik1"
        }
    ]
}
```
