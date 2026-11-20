label: ready-for-agent

# 05: Translation catalogue (prefactor)

Spec: `docs/specs/grill-arena-language-consensus.md`.

**What to build:** every interface text (buttons, labels, hints, statuses, messages, generated result labels) and the fixed skeleton of the Summary move into one catalogue, in English, shared by the server and the browser. Behaviour is unchanged: the interface and the Summary read exactly as before. This makes the French catalogue of ticket 06 a pure addition. A missing key in a language falls back to English.

**Blocked by:** 02 (Option letters), 03 (Single Scoreboard), 04 (Folded results and banner), so that only final texts are moved.

**Status:** ready-for-agent

- [ ] No interface text remains hard-coded outside the catalogue, apart from content supplied by Claude or Players and API error messages for Claude, which stay in English.
- [ ] The server builds the Summary skeleton from the catalogue; the Summary text is identical to before.
- [ ] The browser loads the catalogue once and renders from it; the interface is visually unchanged.
- [ ] A missing key falls back to English instead of showing a blank or a key name.
- [ ] Existing tests still pass unchanged.
