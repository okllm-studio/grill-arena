label: ready-for-agent

# 07: Documentation and manual checklist

Spec: `docs/specs/grill-arena-language-consensus.md`.

**What to build:** the README and the skill describe the final behaviour, and the browser-only behaviour of the spec is verified by hand.

- README: interface language setting and `GRILL_LANG`, Consensus and the banner, single Scoreboard; remove anything mentioning the podium or other removed behaviour.
- Skill: Option letters, Summary in the Session language, consensus fields of the closing result.
- Manual checklist, run in a browser on a computer, a phone and behind the tunnel: Option letters on every control; folded Questions with colour and text label; banner in each case (consensual, N out of M, none when nothing is assessed); language switch on a Player's page; no podium; Scoreboard shown once, and hidden when not published.

**Blocked by:** 04 (Folded results and banner), 06 (Interface language).

**Status:** ready-for-agent

- [ ] README and skill match the delivered behaviour; no mention of the podium remains.
- [ ] Every item of the manual checklist is ticked, or the failures are noted in `improvements.md`.
- [ ] The spec is moved to `docs/specs/` in the same commit as the code, as the project's convention requires.
