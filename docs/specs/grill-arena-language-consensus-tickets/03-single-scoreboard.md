label: ready-for-agent

# 03: A single Scoreboard

Spec: `docs/specs/grill-arena-language-consensus.md`.

**What to build:** the Scoreboard is displayed in one place at a time, and only if it has been published. The podium is removed.

- During the Session, once published (early by the Facilitator), it is available from the top button and panel.
- Once the Session has ended and the Scoreboard is published, the end-of-Session card shows it once; the top button and panel, and the Scoreboard block of the Facilitator tab, are hidden.
- If it was never published, the end-of-Session page does not show it.
- The Facilitator's publication button and its review of the Scoreboard before publication are unchanged during the Session.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] No podium anywhere.
- [ ] At the end of a Session with a published Scoreboard, it appears exactly once on the Players' page and once on the Facilitator's end view, with no top button or duplicate block.
- [ ] A Scoreboard that is not published is absent from the end-of-Session page.
- [ ] During the Session, the top button and panel work as before once the Scoreboard is published.
- [ ] Existing API tests on publication still pass; the display rules go into the manual checklist of ticket 07.
