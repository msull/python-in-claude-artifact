# Third-party notices

This repository redistributes parts of Pyodide and CPython. They are not covered by the MIT license in `LICENSE`, which applies only to the probe's own files (`index.html`, `py/worker.js`, `tools/` and the README).

## Pyodide 0.26.4

- Files: `py/pyodide.js`, `py/pyodide.asm.js`, `py/pyodide.asm.wasm`, `py/pyodide-lock.json`, and the `pyodide` and `_pyodide` Python packages inside `py/stdlib.json`.
- License: Mozilla Public License 2.0. Full text in [licenses/MPL-2.0.txt](licenses/MPL-2.0.txt).
- Source code: https://github.com/pyodide/pyodide/tree/0.26.4
- Obtained from the `pyodide` npm package, version 0.26.4.
- Modifications: none to the files' contents. The Python packages are stored as entries in `py/stdlib.json` instead of inside `python_stdlib.zip`.

`py/pyodide.asm.wasm` is the CPython interpreter and the libraries it links against, compiled to WebAssembly by the Pyodide project. The Pyodide and CPython repositories carry the notices for those bundled libraries.

## CPython 3.12.1 standard library

- Files: the standard library modules inside `py/stdlib.json`, and the interpreter in `py/pyodide.asm.wasm`.
- License: Python Software Foundation License Version 2 and the earlier licenses it incorporates. Full text in [licenses/PYTHON-LICENSE.txt](licenses/PYTHON-LICENSE.txt).
- Copyright (c) 2001-2023 Python Software Foundation. All rights reserved.
- Source code: https://github.com/python/cpython/tree/v3.12.1
- Summary of changes: the module sources are unchanged. They were extracted from Pyodide's `python_stdlib.zip` and stored as text entries in one JSON file by `tools/unpack_stdlib.py`.
