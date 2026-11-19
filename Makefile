# Port du serveur (identique pour le tunnel).
PORT ?= 4242

# Sortie de `make tunnel`, d'où `make start` extrait l'URL publique.
JOURNAL_TUNNEL := seances/.tunnel.log

# URL publique https://<aléatoire>.trycloudflare.com attribuée par Cloudflare.
# Lue dans le journal du tunnel s'il tourne ; vide sinon (réseau local).
# Peut être forcée : make start URL=https://...
URL ?= $(shell grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' $(JOURNAL_TUNNEL) 2>/dev/null | head -n 1)

.PHONY: start tunnel test

# Lance le serveur, avec l'URL du tunnel si `make tunnel` tourne dans un autre terminal.
start:
	@if [ -n "$(URL)" ]; then echo "Tunnel détecté : $(URL)"; else echo "Pas de tunnel : réseau local uniquement"; fi
	GRILL_ARENA_PORT=$(PORT) GRILL_ARENA_URL_PUBLIQUE=$(URL) node src/main.js

# Ouvre le tunnel Cloudflare (terminal dédié, à laisser tourner), à lancer avant `make start`.
tunnel:
	@mkdir -p seances
	@trap 'rm -f $(JOURNAL_TUNNEL)' EXIT; \
	cloudflared tunnel --url http://localhost:$(PORT) 2>&1 | tee $(JOURNAL_TUNNEL)

test:
	npm test
