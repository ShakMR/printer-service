# LAN Print Server for macOS

This folder contains a standalone Apple Silicon executable. It includes its Node.js runtime and application dependencies; the target Mac does not need Node.js, npm, Docker, or a project checkout.

## Start the server

Open Terminal in this folder and run:

```sh
chmod +x macos-lan-print-server
./macos-lan-print-server
```

The server listens on `0.0.0.0:3000`. Open `http://localhost:3000` on the Mac, or use the Mac's LAN address from another device, such as `http://192.168.1.20:3000`.

The executable starts with safe defaults and does not require a configuration file. To change a setting for this launch, use command-line options:

```sh
./macos-lan-print-server --port 8080 --max-upload-bytes 20971520 --log-level debug
```

Available options are `--host`, `--port`, `--max-upload-bytes`, `--temp-dir`, `--log-level`, `--log-file`, and `--log-max-bytes`.

## Optional configuration

Copy `.env.example` to `.env` beside the executable and edit it. The executable loads that file automatically. Command-line options take precedence over values from `.env`.

The default upload limit is 10 MiB. The default log file is `~/Library/Logs/lan-print-server/server.log`, with rotation at 10 MiB. Set `LOG_LEVEL=debug` when diagnosing printer discovery or a failed print request.

## macOS printer checks

Before using the web page, confirm macOS can see the printer:

```sh
lpstat -p
```

The server uses `lpstat` to populate the printer list and `lp` to submit PDFs. If discovery fails, check that the printer is installed for the logged-in macOS user. If another device cannot connect, allow incoming connections for the executable in the macOS firewall and verify that both devices are on the same network.

## Security and limitations

This server has no authentication and is intended for a trusted LAN. Anyone who can reach the port can submit a print job. The accepted response means that CUPS accepted the request; physical printing can still fail later.

On first launch, macOS may require approval in Privacy & Security because this executable is ad-hoc signed. Production distribution should use Developer ID signing and notarization.
