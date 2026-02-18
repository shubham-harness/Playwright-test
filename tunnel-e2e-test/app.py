"""
Simple web app for testing Playwright tunnel support.

Run this on your local machine (behind firewall), then verify that
a Playwright build running in the K8s cluster can reach it via the tunnel.

Usage:
    python app.py [--port PORT]

The app serves a single page with a heading and a data attribute that
the Playwright test asserts against.
"""

import http.server
import argparse


HTML = """\
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tunnel Test App</title>
    <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
        .card { background: white; padding: 2rem 3rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.1); text-align: center; }
        h1 { color: #333; }
        p  { color: #666; }
        .status { color: #22c55e; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <h1 data-testid="heading">Tunnel Test App</h1>
        <p class="status" data-testid="status">Connection Successful</p>
        <p>If you can see this page through the tunnel, the proxy is working.</p>
    </div>
</body>
</html>
"""


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(HTML.encode())

    def log_message(self, fmt, *args):
        print(f"[request] {self.client_address[0]} - {fmt % args}")


def main():
    parser = argparse.ArgumentParser(description="Tunnel test web app")
    parser.add_argument("--port", type=int, default=3001, help="Port to listen on (default: 3001)")
    args = parser.parse_args()

    server = http.server.HTTPServer(("0.0.0.0", args.port), Handler)
    print(f"🚀 Tunnel test app listening on http://0.0.0.0:{args.port}")
    print(f"   Local URL: http://127.0.0.1:3001:{args.port}")
    print(f"   Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()

