#!/usr/bin/env python3
"""Python equivalent of server.js — concurrent-safe static + /api/verify server."""

import json
import os
import sys
import threading
import traceback
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 3007
HOST = "0.0.0.0"
ROOT = Path(__file__).resolve().parent / "public"
DATA_DIR = Path(__file__).resolve().parent / "data"
KEYS_FILE = DATA_DIR / "cheat-keys.json"
BINDINGS_FILE = DATA_DIR / "cheat-bindings.json"

MAX_BODY = 64 * 1024
MAX_WORKERS = 512          # hard cap on concurrent request handlers
SOCKET_BACKLOG = 2048      # OS-level accept queue
STREAM_CHUNK = 64 * 1024

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".wasm": "application/wasm",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "audio/ogg",
    ".txt": "text/plain; charset=utf-8",
    ".map": "application/json; charset=utf-8",
}

# Serializes bindings read-modify-write across worker threads.
_bindings_lock = threading.Lock()


def read_json(path: Path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return fallback


def write_json_atomic(path: Path, data) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def resolve_safe(url_path: str):
    """Resolve URL path under ROOT, reject traversal."""
    raw = url_path.split("?", 1)[0].split("#", 1)[0]
    try:
        decoded = urllib.parse.unquote(raw)
    except Exception:
        return None
    decoded = decoded.lstrip("/\\")
    candidate = (ROOT / decoded).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        return None
    return candidate


class Handler(BaseHTTPRequestHandler):
    server_version = "sitefinalv2-py/1.0"
    protocol_version = "HTTP/1.1"

    # ---- helpers -------------------------------------------------------
    def _send(self, status: int, body: bytes, headers: dict | None = None):
        headers = dict(headers or {})
        headers.setdefault("Content-Length", str(len(body)))
        headers.setdefault("Connection", "close")
        try:
            self.send_response(status)
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _send_json(self, status: int, obj):
        body = json.dumps(obj).encode("utf-8")
        self._send(status, body, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
        })

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return b""
        if length > MAX_BODY:
            raise ValueError("Body too large")
        return self.rfile.read(length)

    # ---- /api/verify ---------------------------------------------------
    def _handle_verify(self):
        try:
            raw = self._read_body()
            body = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            return self._send_json(400, {"success": False, "error": "Invalid JSON"})

        key = (body.get("key") or "").strip().upper() if isinstance(body.get("key"), str) else ""
        hwid = (body.get("hwid") or "").strip() if isinstance(body.get("hwid"), str) else ""
        map_type = (body.get("mapType") or "").strip() if isinstance(body.get("mapType"), str) else ""

        if not key or not hwid or not map_type:
            return self._send_json(400, {"success": False, "error": "Missing fields"})

        keys = read_json(KEYS_FILE, None)
        if not keys or not isinstance(keys.get(map_type), list):
            return self._send_json(500, {"success": False, "error": "Keys not configured"})

        if key not in keys[map_type]:
            return self._send_json(403, {"success": False, "error": "Invalid key"})

        with _bindings_lock:
            bindings = read_json(BINDINGS_FILE, {}) or {}
            existing = bindings.get(key)
            if existing:
                if existing.get("hwid") == hwid:
                    return self._send_json(200, {"success": True, "bound": True})
                return self._send_json(403, {
                    "success": False,
                    "error": "Key already bound to another device",
                })
            bindings[key] = {
                "hwid": hwid,
                "mapType": map_type,
                "boundAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
            try:
                write_json_atomic(BINDINGS_FILE, bindings)
            except Exception:
                return self._send_json(500, {"success": False, "error": "Persist failed"})

        return self._send_json(200, {"success": True, "bound": False})

    # ---- static --------------------------------------------------------
    def _stream_file(self, file: Path):
        ext = file.suffix.lower()
        mime = MIME.get(ext, "application/octet-stream")
        try:
            size = file.stat().st_size
        except OSError:
            return self._send(404, b"Not Found")
        try:
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(size))
            self.send_header("Connection", "close")
            self.end_headers()
            if self.command == "HEAD":
                return
            with open(file, "rb") as f:
                while True:
                    chunk = f.read(STREAM_CHUNK)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _serve_static(self):
        target = resolve_safe(self.path or "/")
        if target is None:
            return self._send(403, b"Forbidden")
        if target.is_dir():
            idx = target / "index.html"
            if idx.is_file():
                return self._stream_file(idx)
            return self._send(404, b"Not Found")
        if target.is_file():
            return self._stream_file(target)
        # .html fallback (matches server.js behavior)
        alt = target.with_suffix(target.suffix + ".html") if target.suffix else target.with_suffix(".html")
        if alt.is_file():
            return self._stream_file(alt)
        return self._send(404, b"Not Found")

    # ---- routing -------------------------------------------------------
    def do_POST(self):
        try:
            if self.path == "/api/verify":
                return self._handle_verify()
            return self._send(405, b"Method Not Allowed")
        except Exception:
            traceback.print_exc()
            try:
                return self._send_json(500, {"success": False, "error": "Server error"})
            except Exception:
                pass

    def do_GET(self):
        try:
            return self._serve_static()
        except Exception:
            traceback.print_exc()
            try:
                return self._send(500, b"Server error")
            except Exception:
                pass

    def do_HEAD(self):
        self.do_GET()

    def log_message(self, fmt, *args):
        # Quiet default logger; uncomment for verbose access logs.
        # sys.stderr.write("%s - - %s\n" % (self.address_string(), fmt % args))
        return


class PooledHTTPServer(ThreadingHTTPServer):
    """ThreadingHTTPServer but request handling runs on a bounded thread pool.

    Caps concurrent handlers so flash crowds cannot exhaust threads/FDs.
    Excess connections wait in the OS accept backlog instead of crashing.
    """
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = SOCKET_BACKLOG

    def __init__(self, *args, max_workers: int = MAX_WORKERS, **kwargs):
        super().__init__(*args, **kwargs)
        self._executor = ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="http",
        )

    def process_request(self, request, client_address):
        self._executor.submit(self._safe_handle, request, client_address)

    def _safe_handle(self, request, client_address):
        try:
            self.finish_request(request, client_address)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        except Exception:
            traceback.print_exc()
        finally:
            try:
                self.shutdown_request(request)
            except Exception:
                pass

    def handle_error(self, request, client_address):
        # Never let one bad request kill the server.
        traceback.print_exc()

    def server_close(self):
        try:
            self._executor.shutdown(wait=False, cancel_futures=True)
        finally:
            super().server_close()


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not BINDINGS_FILE.exists():
        try:
            write_json_atomic(BINDINGS_FILE, {})
        except Exception:
            pass

    server = PooledHTTPServer((HOST, PORT), Handler)
    print(f"Serving {ROOT} -> http://localhost:{PORT}")
    print(f"Keys: {KEYS_FILE}")
    print(f"Bindings: {BINDINGS_FILE}")
    print(f"Pool: {MAX_WORKERS} workers, backlog: {SOCKET_BACKLOG}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.server_close()


if __name__ == "__main__":
    sys.exit(main() or 0)
