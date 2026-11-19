# Server port (same for the tunnel).
PORT ?= 4242

# Output of `make tunnel`, from which `make start` extracts the public URL.
TUNNEL_LOG := sessions/.tunnel.log

# Public URL https://<random>.trycloudflare.com assigned by Cloudflare.
# Read from the tunnel log if it is running; empty otherwise (local network).
# Can be forced: make start URL=https://...
URL ?= $(shell grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' $(TUNNEL_LOG) 2>/dev/null | head -n 1)

.PHONY: start tunnel test

# Starts the server, with the tunnel URL if `make tunnel` is running in another terminal.
start:
	@if [ -n "$(URL)" ]; then echo "Tunnel detected: $(URL)"; else echo "No tunnel: local network only"; fi
	GRILL_ARENA_PORT=$(PORT) GRILL_ARENA_PUBLIC_URL=$(URL) node src/main.js

# Opens the Cloudflare tunnel (dedicated terminal, leave it running), to run before `make start`.
tunnel:
	@mkdir -p sessions
	@trap 'rm -f $(TUNNEL_LOG)' EXIT; \
	cloudflared tunnel --url http://localhost:$(PORT) 2>&1 | tee $(TUNNEL_LOG)

test:
	npm test
