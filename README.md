# Python Gate Probe

A small test page for Claude Artifacts. It answers two questions:

1. Can a page gate a feature on whether the viewer has a particular MCP server (here a local server named Switchboard)? The gated feature is a demo button that does nothing except count its clicks.
2. Does a self-hosted Python interpreter (Pyodide, compiled to WebAssembly) run inside the artifact frame?

## What it found (2026-11-17)

- WebAssembly compilation is allowed in the artifact frame.
- A Web Worker starts from a file published beside the page.
- Pyodide 0.26.4 boots Python 3.12.1 in the worker and runs scripts. Boot takes about 8 seconds.
- Artifacts do not serve `.zip` files, and Pyodide boots from a zipped standard library. The library is therefore published as source text in `py/stdlib.json`, and the worker rebuilds an uncompressed zip in memory before starting the interpreter.
- The gate locks when Switchboard is not reachable, both in a browser tab and in the Claude desktop app without the server connected. The unlocked path has not been confirmed yet.
- Python runs for every viewer and does not depend on the gate.

## Files

| File | Size | What it is |
|---|---|---|
| `index.html` | 21 KB | The page: gate, runtime checks, editor |
| `py/worker.js` | 6 KB | Worker that packs the standard library, boots Python and runs scripts |
| `py/pyodide.js` | 15 KB | Pyodide loader (unmodified) |
| `py/pyodide.asm.js` | 1.2 MB | Pyodide JavaScript glue (unmodified) |
| `py/pyodide.asm.wasm` | 10.1 MB | The Python interpreter (unmodified) |
| `py/pyodide-lock.json` | 106 KB | Pyodide package index (unmodified) |
| `py/stdlib.json` | 9.2 MB | Python standard library as source text, repackaged from Pyodide's `python_stdlib.zip` |
| `tools/unpack_stdlib.py` | 1 KB | Script that produced `py/stdlib.json` |

To regenerate `py/stdlib.json` from the `pyodide` npm package (version 0.26.4):

```
python3 tools/unpack_stdlib.py path/to/python_stdlib.zip py/stdlib.json
```

The file contents are unchanged; only the container differs.

## Running it

**As an artifact.** Publish `index.html` with the `py/` folder as supporting files, declaring these capabilities:

```json
{
  "mcp": { "servers": [{ "server": "host:switchboard", "tools": ["hosts"] }] },
  "db": {},
  "user": {}
}
```

The page writes its results to the artifact database at `probes/latest`. To gate on a different server, change `SERVER` and the tool call in `index.html`.

**Outside an artifact.** Three things differ:

- `index.html` is a fragment. Artifacts wrap it in an `<html>`, `<head>` and `<body>` skeleton at publish time, so add one.
- There is no connector access, so the gate stays locked and the gated button stays disabled. Python still runs.
- It needs a web server. Opened from disk, the browser blocks the worker and the file fetches.

Outside an artifact you can also skip `py/stdlib.json` entirely: use Pyodide's original `python_stdlib.zip` and drop the packing code from `py/worker.js`.

## License

The probe's own files (`index.html`, `py/worker.js`, `tools/unpack_stdlib.py` and this README) are under the MIT license. See [LICENSE](LICENSE).

Everything else under `py/` comes from Pyodide and CPython and keeps its original license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
