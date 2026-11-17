# Python in a Claude Artifact

A demo of a real Python interpreter running inside a Claude Artifact. The page boots Pyodide (CPython compiled to WebAssembly) in a Web Worker, from files published alongside the page, and gives you an editor to run scripts. Code executes in the viewer's browser.

## What it shows (first tested 2026-11-17)

- WebAssembly compilation is allowed in the artifact frame.
- A Web Worker starts from a file published beside the page.
- Pyodide 0.26.4 boots Python 3.12.1 in the worker and runs scripts. Startup takes about 8 seconds.
- Artifacts do not serve `.zip` files, and Pyodide boots from a zipped standard library. The library is therefore published as source text in `py/stdlib.json`, and the worker rebuilds an uncompressed zip in memory before starting the interpreter.
- Artifacts block runtime fetches to other hosts, so everything is self-hosted and `micropip` cannot install from PyPI. Only the standard library is available; packages such as numpy are not included.

## Files

| File | Size | What it is |
|---|---|---|
| `index.html` | 14 KB | The page: editor, output, startup log |
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

**As an artifact.** Publish `index.html` with the `py/` folder as supporting files. No runtime capabilities are needed.

**Outside an artifact.** Two things differ:

- `index.html` is a fragment. Artifacts wrap it in an `<html>`, `<head>` and `<body>` skeleton at publish time, so add one.
- It needs a web server. Opened from disk, the browser blocks the worker and the file fetches.

Outside an artifact you can also skip `py/stdlib.json` entirely: use Pyodide's original `python_stdlib.zip` and drop the packing code from `py/worker.js`.

## License

This project's own files (`index.html`, `py/worker.js`, `tools/unpack_stdlib.py` and this README) are under the MIT license. See [LICENSE](LICENSE).

Everything else under `py/` comes from Pyodide and CPython and keeps its original license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
