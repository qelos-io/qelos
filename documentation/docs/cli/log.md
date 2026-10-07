---
title: Log Command
editLink: true
---
# Log Command

The `qelos log` command prints platform event logs (the same events shown in the admin panel's Events page) directly in your terminal. You can filter them, tail them live, or fetch a single log with its full metadata.

## Usage

```bash
qelos log [id] [options]
```

| Option | Alias | Default | Description |
|---|---|---|---|
| `--kind <kind>` | | | Only logs of this kind |
| `--source <source>` | | | Only logs from this source |
| `--event-name <name>` | | | Only logs with this event name |
| `--time <duration>` | `-t` | `30m` | How far back to look. A bare number is minutes; units: `s`, `m`, `h`, `d` (e.g. `45s`, `2h`, `1d`) |
| `--follow` | `-f` | `false` | Keep running and print new logs as they arrive |
| `--json` | | `false` | Print each log as a single JSON line |

## List logs

```bash
qelos log --kind ai --source openai --event-name completion --time 2h
```

Logs are printed oldest first, one per line:

```
64f1c2b8e4b0a1a2b3c4d5e6 2026-10-07T10:15:02.114Z [ai] openai completion - Chat completion finished
```

The first column is the log ID. Lines show a short summary only; the full `metadata` is not printed in the list. Use `--json` to get the complete item per line, or fetch a single log by ID (below).

## Follow logs

```bash
qelos log --kind ai -f
```

The initial window (`--time`) is printed first. After that, every **5 seconds** the command requests only the gap between the previous poll and now, and prints those logs. Nothing is printed twice, even for logs sitting exactly on a poll boundary. If a poll fails, the error is printed and the same gap is retried on the next tick. Press `Ctrl+C` to stop.

## Get a single log

```bash
qelos log 64f1c2b8e4b0a1a2b3c4d5e6
```

Prints the whole log item as formatted JSON, including its full `metadata`.

## Authentication

Like every other command, `qelos log` authenticates using your stored credentials, `QELOS_API_TOKEN`/`QELOS_USERNAME`+`QELOS_PASSWORD` environment variables, or a `--global` environment. See the [CLI Introduction](/cli/) for the full authentication precedence.

## Related

- [Global Environments](/cli/global) — run this command against a registered project from any directory
