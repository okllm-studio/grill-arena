# Server port (same for the tunnel).
PORT ?= 4242

# Output of `make tunnel`, from which `make start` extracts the public URL.
TUNNEL_LOG := sessions/.tunnel.log

# Public URL https://<random>.trycloudflare.com assigned by Cloudflare.
# Read from the tunnel log if it is running; empty otherwise (local network).
# Can be forced: make start URL=https://...
URL ?= $(shell grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' $(TUNNEL_LOG) 2>/dev/null | head -n 1)

.PHONY: start tunnel test install-skill

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

# Installs the skill as a symlink to the repository (idempotent). Once linked, a `git pull` is enough to update it.
SKILL_LINK := $(HOME)/.claude/skills/grilling-arena

install-skill:
	@mkdir -p $(dir $(SKILL_LINK))
	@if [ -e "$(SKILL_LINK)" ] && [ ! -L "$(SKILL_LINK)" ]; then echo "$(SKILL_LINK) exists and is not a symlink: remove it first"; exit 1; fi
	@ln -sfn "$(CURDIR)/skill/grilling-arena" "$(SKILL_LINK)"
	@echo "Skill linked: $(SKILL_LINK) -> $(CURDIR)/skill/grilling-arena"
