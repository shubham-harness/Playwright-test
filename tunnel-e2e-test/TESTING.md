# Testing Playwright Tunnel Support

## Overview

This test verifies that Playwright builds can reach applications behind a firewall
via the chisel tunnel proxy.

**Architecture:**
```
Playwright browser (K8s pod)
    → SOCKS5 proxy (tunnel-server:{port})
    → chisel reverse tunnel
    → chisel client (your machine)
    → localhost:3000 (web app on your machine)
```

## Prerequisites

- A tunnel already created in Relicx (Settings → Tunnels → Create)
- The `relicx_agent` (chisel client) running on your machine
- A build configured in Relicx

## Step-by-step

### 1. Start the test web app

```bash
cd tests/tunnel-e2e-test
python app.py --port 3000
```

You should see:
```
🚀 Tunnel test app listening on http://0.0.0.0:3000
```

Verify it's working by visiting http://localhost:3000 in your browser.

### 2. Ensure your tunnel is connected

Make sure the `relicx_agent` / chisel client is running and connected to the tunnel-server.
You should have a tunnel name (e.g. `my-tunnel`) visible in the Relicx UI under Settings → Tunnels.

### 3. Upload the Playwright test project

This test project (`tests/tunnel-e2e-test/`) needs to be part of your build's git repo,
or you can zip it and upload to S3 manually.

**Important:** The `BASE_URL` defaults to `http://localhost:3000`. When the test runs
through the tunnel, `localhost` resolves from the chisel client's perspective (your machine),
so it will reach the web app running on your machine.

### 4. Trigger the build with tunnel

Via API:
```bash
curl -X POST https://<relicx-host>/api/build/<build-id>/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "configOverride": {
      "tunnelName": "<your-tunnel-name>"
    }
  }'
```

Or from the Relicx UI, select the tunnel when executing the build.

### 5. Verify

- The build run should show the tests passing
- In the K8s job logs, you should see:
  ```
  Tunnel requested: <your-tunnel-name>
  Tunnel configured successfully. Using config: playwright.tunnel.config.cjs
  ```
- The web app terminal should show incoming requests from the tunnel

### Local testing (without tunnel)

To verify the test itself works locally:

```bash
cd tests/tunnel-e2e-test
npm install
npx playwright install --with-deps
BASE_URL=http://localhost:3000 npx playwright test
```

This runs the test directly (no tunnel) to confirm the test assertions are correct.

