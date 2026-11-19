# grill-arena

**Run a grilling session with a whole group, not just one person.**

*Grilling* is a relentless interview that sharpens a plan or a design until everyone shares the same understanding. With a single person, Claude asks questions in the terminal. grill-arena turns it into a collective session: Claude publishes each round of questions (a *Step*) on a small local web page, the group discusses and decides, and Claude carries on with the next round based on the outcome.

Each question comes with a recommended answer and a few mutually exclusive options. The group decides by majority vote, and the comments people leave are passed back to Claude. A split vote is never settled silently: it signals a disagreement worth discussing out loud, so the question comes back to the table.

## Typical scenarios

- **Everyone around the table.** The group discusses each question out loud. Once there is an agreement, the facilitator (the *Animateur*) records it on the page. The facilitator can play too, so as the only player they stand for the whole table. The page is a shared whiteboard for decisions.
- **Everyone votes on their own device.** Players open the page on their phone or laptop (a QR code is displayed), vote and comment individually, and the facilitator closes the round once everybody has answered. Votes stay hidden until the round closes, so nobody is influenced by the others.
- **Some people are remote.** A [Cloudflare tunnel](https://developers.cloudflare.com/tunnel/) publishes the page under a temporary HTTPS URL, so colleagues who cannot be on site join the same session, with nothing to install and no account.
- **Mixed.** All of the above at once: part of the group in the room, the rest online, and the discussion happening out loud or in a call.

At the end of the session the group gets a summary of the decisions, the participation statistics and a score table, and Claude is left with a glossary, decision records and a working document to write the spec from (see [Origin and prerequisites](#origin-and-prerequisites)).

## Vocabulary

The application, its skill and its documentation use a French domain vocabulary, defined in [`GLOSSARY.md`](GLOSSARY.md). The terms used below:

| Term | Meaning |
|---|---|
| Séance | A session. |
| Étape | A Step: one round of questions published together. |
| Ouverture | The moment the facilitator opens a published Step for voting. |
| Question | A decision put to the group, with closed Propositions and one recommended. |
| Proposition | One possible answer to a Question. |
| Animateur | The facilitator, who opens and closes Steps. |
| Co-animateur | A Joueur the Animateur lets open and close Steps in their place. |
| Joueur | A participant who votes and comments. |
| Vote / Commentaire | A choice among the Propositions / a free text passed on to Claude. |

Specs are in [`docs/specs/`](docs/specs/).

## Origin and prerequisites

grill-arena extends the skills of [Matt Pocock](https://github.com/mattpocock/skills): `/grilling-arena` is the multiplayer version of his `grill-with-docs` skill (`grilling` + `domain-modeling`). The `mattpocock-skills` Claude Code plugin is required:

- `domain-modeling` is loaded by `/grilling-arena` to maintain `GLOSSARY.md` and `docs/adr/` during the session;
- `to-spec` (run afterwards by the user) turns the working document left by the session (`docs/specs-to-implement/<subject>-recapitulatif.md`) into a spec;
- `grilling` remains the reference for the discipline (decision tree, frontier, recommendations).

Without the plugin, a session still runs but produces no glossary and no ADRs.

## Quick start

1. `npm install` (once).
2. For players outside the local network, in a dedicated terminal: `make tunnel` (leave it running).
3. In another terminal: `make start`. It picks up the tunnel URL by itself if a tunnel is running; otherwise the session stays on the local network.
4. Open the Animateur URL printed at startup (with `?jeton=`), and share the Joueurs URL (or the QR code on the Animateur page).
5. In Claude Code, run `/grilling-arena` with the subject of the session.

Install the skill once with `ln -s "$PWD/skill/grilling-arena" ~/.claude/skills/grilling-arena`. Tests: `npm test`.

Details (local network, tunnel, variables, security) follow.

## Setup

### Requirements

- Node.js 20 or later.
- `npm install` once in the repository.

### Run a session on the local network

```
npm start
```

The terminal prints:
- `Joueurs`: one URL per local IP address, to share on the same network (the Animateur page also shows a QR code).
- `Animateur`: the URL with the token, to open in your browser.
- `API Claude`: the address the skill uses, with the token.

The token is also written to `seances/.jeton` (readable by the current user only), and the port to `seances/.port`.

### Share with players outside the local network (tunnel)

The server stays on your machine. A `cloudflared` tunnel publishes its port under a random HTTPS URL `https://<random>.trycloudflare.com`. No Cloudflare account is needed, neither for you nor for the players.

**1. Install cloudflared** (once)

Official `.deb` package (Debian/Ubuntu, amd64):
```
curl -LO https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
cloudflared --version
```
For another architecture or system, see the [Cloudflare installation documentation](https://developers.cloudflare.com/tunnel/downloads/).

**2. Open the tunnel** (in a dedicated terminal, leave it running)

```
make tunnel
```

Note the `https://….trycloudflare.com` URL it prints. It changes every time the tunnel is opened.

**3. Start the server with that URL** (in another terminal)

```
make start
```

`make start` reads the URL from `seances/.tunnel.log`, written by `make tunnel` (deleted when the tunnel stops). You can also pass it by hand: `make start URL=https://<random>.trycloudflare.com`.

The terminal then prints:
- `Joueurs`: the public URL, to share (the QR code on the Animateur page encodes the same URL);
- `Animateur`: a local URL `http://127.0.0.1:<port>/?jeton=…`. It deliberately stays local: the token must not go through the tunnel.

Change the port with `make tunnel PORT=…` and `make start PORT=… URL=…` (same value on both sides). Without `URL`, `make start` runs a session on the local network.

**Stopping**: `Ctrl+C` in the server terminal, then in the tunnel terminal. Players can no longer connect, and opening a new tunnel gives a new URL.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `GRILL_ARENA_PORT` | `4242` | Port the server listens on. |
| `GRILL_ARENA_DOSSIER` | `./seances` | Folder where sessions are saved. |
| `GRILL_ARENA_URL_PUBLIQUE` | (empty) | Public (tunnel) URL shown to players instead of local addresses. The Animateur link stays local. |

### Security

- The server listens on all interfaces (`0.0.0.0`): on the local network, any device that knows the address and port can join the session.
- The Animateur and Claude routes (publish a Step, end the session) require the token; opening and closing a Step also accept a Co-animateur (identified by their `joueur`). The token goes in an `Authorization: Bearer` header or in a `?jeton=` parameter. Never share a URL containing `?jeton=`.
- The Joueur routes (join, answer) require no token: the session URL is the only secret. Share it only with the intended group, and shut the session down at the end (`Ctrl+C`).
- With a tunnel, player traffic is encrypted over HTTPS end to end as far as Cloudflare. The Animateur link never leaves the machine.
- Cloudflare quick tunnels are meant for occasional use, with no availability or throughput guarantee. Do a dry run before the session, especially with phones (real-time `/api/evenements` stream and long-poll).
