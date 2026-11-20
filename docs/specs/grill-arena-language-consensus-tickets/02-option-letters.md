label: ready-for-agent

# 02: Option letters everywhere

Spec: `docs/specs/grill-arena-language-consensus.md`.

**What to build:** the identifier of each Option (A, B, C…) is displayed before its text wherever an Option appears, so that Players can match the controls with the letters cited in the body of a Question. The skill asks Claude for consecutive capital letters starting at A and for the body to cite Options by them. No server-side refusal is added: an atypical identifier is displayed as is.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The letter precedes the Option text on vote buttons, result bars, the live distribution and the Facilitator's tie-break selector.
- [ ] The Summary shows the letter of each Selected option.
- [ ] An Option with a non-letter identifier is accepted and displayed as is.
- [ ] The skill documentation asks for consecutive capital letters and for the body to cite Options by letter.
- [ ] A test through the API checks the letter in the Summary and the acceptance of an atypical identifier; browser rendering goes into the manual checklist of ticket 07.
