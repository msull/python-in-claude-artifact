/* Runs Pyodide from the files published beside the page. Classic worker.
 *
 * Artifacts do not serve .zip files, and Pyodide boots from a zipped standard
 * library. So the library is published as plain source text (stdlib.json) and
 * packed into an uncompressed zip here, in memory, before the interpreter starts.
 */
var py = null;
var current = null;
var base = new URL(".", self.location.href).href;
var STDLIB_URL = base + "python_stdlib.zip";
var stdlibZip = null;

function send(m) { self.postMessage(m); }

var CRC_TABLE = (function () {
  var t = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b) {
  var c = 0xFFFFFFFF;
  for (var i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* entries: [[path, text], ...] -> Uint8Array of a stored (method 0) zip. */
function buildZip(entries) {
  var enc = new TextEncoder();
  var size = 22;
  var files = entries.map(function (e) {
    var f = { name: enc.encode(e[0]), data: enc.encode(e[1]) };
    size += 76 + 2 * f.name.length + f.data.length;
    return f;
  });
  var buf = new Uint8Array(size);
  var dv = new DataView(buf.buffer);
  var p = 0;
  files.forEach(function (f) {
    f.crc = crc32(f.data);
    f.offset = p;
    dv.setUint32(p, 0x04034b50, true);
    dv.setUint16(p + 4, 20, true);
    dv.setUint16(p + 6, 0x0800, true);
    dv.setUint16(p + 12, 33, true);
    dv.setUint32(p + 14, f.crc, true);
    dv.setUint32(p + 18, f.data.length, true);
    dv.setUint32(p + 22, f.data.length, true);
    dv.setUint16(p + 26, f.name.length, true);
    p += 30;
    buf.set(f.name, p); p += f.name.length;
    buf.set(f.data, p); p += f.data.length;
  });
  var cdStart = p;
  files.forEach(function (f) {
    dv.setUint32(p, 0x02014b50, true);
    dv.setUint16(p + 4, 20, true);
    dv.setUint16(p + 6, 20, true);
    dv.setUint16(p + 8, 0x0800, true);
    dv.setUint16(p + 14, 33, true);
    dv.setUint32(p + 16, f.crc, true);
    dv.setUint32(p + 20, f.data.length, true);
    dv.setUint32(p + 24, f.data.length, true);
    dv.setUint16(p + 28, f.name.length, true);
    dv.setUint32(p + 42, f.offset, true);
    p += 46;
    buf.set(f.name, p); p += f.name.length;
  });
  dv.setUint32(p, 0x06054b50, true);
  dv.setUint16(p + 8, files.length, true);
  dv.setUint16(p + 10, files.length, true);
  dv.setUint32(p + 12, p - cdStart, true);
  dv.setUint32(p + 16, cdStart, true);
  return buf;
}

/* Hand Pyodide the packed library when it asks for its stdlib URL. */
var realFetch = typeof self.fetch === "function" ? self.fetch.bind(self) : null;
self.fetch = function (input, init) {
  var url = typeof input === "string" ? input : (input && (input.href || input.url)) || "";
  if (url === STDLIB_URL && stdlibZip) {
    return Promise.resolve(new Response(stdlibZip, { status: 200, headers: { "Content-Type": "application/zip" } }));
  }
  return realFetch(input, init);
};

async function step(id, fn) {
  var t = performance.now();
  send({ type: "step", id: id, state: "running" });
  try {
    var detail = await fn();
    send({ type: "step", id: id, state: "pass", detail: detail || "", ms: Math.round(performance.now() - t) });
    return true;
  } catch (e) {
    send({ type: "step", id: id, state: "fail", detail: String((e && e.message) || e).slice(0, 600), ms: Math.round(performance.now() - t) });
    return false;
  }
}

async function boot() {
  send({ type: "hello" });
  var ok = await step("script", function () {
    importScripts(base + "pyodide.js");
    if (typeof loadPyodide !== "function") throw new Error("loadPyodide is not defined after loading pyodide.js");
    return "Loader ready";
  });
  if (!ok) return;

  ok = await step("stdlib", async function () {
    var res = await realFetch(base + "stdlib.json");
    if (!res.ok) throw new Error("stdlib.json answered " + res.status);
    var lib = await res.json();
    stdlibZip = buildZip(lib.text);
    return lib.text.length + " files packed, " + (stdlibZip.length / 1048576).toFixed(1) + " MB";
  });
  if (!ok) return;

  ok = await step("boot", async function () {
    py = await loadPyodide({ indexURL: base, stdLibURL: STDLIB_URL });
    var write = function (s) { if (current !== null) send({ type: "out", run: current, text: s + "\n" }); };
    py.setStdout({ batched: write });
    py.setStderr({ batched: write });
    return "Interpreter started";
  });
  if (!ok) return;

  var version = "";
  ok = await step("selftest", function () {
    var total = py.runPython("sum(range(101))");
    if (total !== 5050) throw new Error("Expected 5050, got " + total);
    version = py.runPython("import sys; sys.version.split()[0]");
    return "sum(range(101)) = 5050 on Python " + version;
  });
  if (!ok) return;
  send({ type: "ready", version: version });
}

async function run(id, code) {
  var t = performance.now();
  current = id;
  try {
    var r = await py.runPythonAsync(code);
    var text = "";
    if (r !== undefined && r !== null) {
      try { text = String(r); } catch (_) { text = "<unprintable result>"; }
      if (r && typeof r.destroy === "function") r.destroy();
    }
    send({ type: "done", run: id, result: text, ms: Math.round(performance.now() - t) });
  } catch (e) {
    send({ type: "err", run: id, text: String((e && e.message) || e), ms: Math.round(performance.now() - t) });
  } finally {
    current = null;
  }
}

self.onmessage = function (e) {
  var m = e.data || {};
  if (m.type === "boot") boot();
  else if (m.type === "run" && py) run(m.run, String(m.code || ""));
};
