# macOS LAN Print Server

This is a small macOS-first Node.js service for printing PDFs from a browser on a trusted local network. It discovers printers through CUPS and invokes `lp` without a shell.

## Requirements and startup

Install Node.js 20 or newer and confirm that macOS can see a printer:

```sh
lpstat -p
npm install
cp .env.example .env
npm run build
npm start
```

The default binding is `0.0.0.0:3000`. Open `http://localhost:3000` on the Mac, or replace the host with the Mac's LAN IP (for example `http://192.168.1.20:3000`) on another device. Configure `HOST`, `PORT`, `MAX_UPLOAD_BYTES`, and `TEMP_DIR` in `.env` when needed. `npm run dev` starts the TypeScript source directly.

## Logging

Logs are JSON lines written to stdout and to `~/Library/Logs/lan-print-server/server.log` by default. The file is rotated to `server.log.1` when it reaches 10 MB. Configure `LOG_LEVEL` (`debug`, `info`, `warn`, or `error`), `LOG_FILE`, and `LOG_MAX_BYTES` in `.env`.

At `debug` level the log includes HTTP timing, printer discovery results, the exact `lpstat` and `lp` argument arrays, upload size/signature decisions, temporary-file creation and cleanup, and command stdout/stderr. PDF contents are never logged. Printer command failures include the host error and stack in the local log while the API continues to return a safe generic response.

## Standalone macOS binaries

The packaging command creates self-contained executables for both Mac architectures:

```sh
npm install
npm run package:macos
```

For an Apple Silicon release only, use `npm run package:macos-arm64`.

The output is written to `release/` as one binary for Intel Macs (`macos-x64`) and one for Apple Silicon (`macos-arm64`). The target Mac does not need Node.js, npm, Docker, or `node_modules`. Copy the matching binary to the Mac, make it executable with `chmod +x`, place a `.env` beside it when you need host-specific settings, and run it from any directory. Packaged binaries load that adjacent `.env`; source runs also load the current working directory's `.env`. macOS may require allowing the binary in Privacy & Security; production distribution should use a Developer ID signature and notarization.

Packaging requires Node.js 22 or newer and npm on the build machine. A single universal Mach-O binary is not produced; distribute the architecture-specific binary that matches the host Mac.

## API

- `GET /health` returns `{ "status": "ok" }`.
- `GET /api/printers` returns `{ "printers": [...] }`; the list is refreshed on every request.
- `POST /api/print` accepts multipart fields `printer` and `file`. The file must begin with the `%PDF-` signature. A successful request returns `201` with `{ "accepted": true, "jobId": "..." }` when CUPS supplies a job id.
- Client errors return `400`, oversized files return `413`, unknown printers return `404`, and print-system failures return `502`.

The accepted response means that CUPS accepted the request; physical printing can still fail later. Uploaded files are written to a uniquely named temporary file only for the request and are removed afterward. They are never served as static files.

## Troubleshooting and limitations

This MVP is intended for a trusted LAN and has no authentication. Use the macOS firewall and network isolation as appropriate. If the page cannot connect, allow incoming connections for Node in the firewall and verify the Mac's LAN IP and port. If discovery or printing fails, run `lpstat -p` and try `lp -d "Printer Name" file.pdf` locally, then check printer permissions and CUPS configuration.

Only macOS is supported today. The HTTP layer depends on the `PrinterService` interface, so another platform can be added behind the service factory later.

Run the checks with `npm test` and `npm run build`.
