label: ready-for-agent

# 06: Interface language, end to end

Spec: `docs/specs/grill-arena-language-consensus.md`.

**What to build:** the Facilitator chooses the interface language of the Session, English or Français, from the Facilitator tab, and everyone sees it.

- A Session setting with a closed list of two values, in the state sent to all Players, persisted with the Session and restored after a restart. Never locked: it can be changed at any time, including after the Opening of Step 1.
- The Facilitator and Co-facilitators can change it; Players are refused.
- Initial value: English, or the server variable `GRILL_LANG` when it names a supported language; any other value falls back to English without failing the start.
- A French catalogue (proposed wording in the spec, adjustable). Players' pages switch at their next refresh, with no action.
- The Summary, shown on the end page and returned to Claude at the end of the Session, is generated in the Session language.
- Not translated: content from Claude or Players, API error messages, `GLOSSARY.md`.

**Blocked by:** 05 (Translation catalogue).

**Status:** ready-for-agent

- [ ] A new Session starts in English; with a supported `GRILL_LANG` it starts in that language; with an unsupported value it starts in English and the server still starts.
- [ ] The Facilitator and a Co-facilitator can change the language before and after the Opening of Step 1; a Player is refused.
- [ ] The language is in the state seen by Players and survives a server restart.
- [ ] The Summary is in the chosen language, with unchanged Claude-provided content, both on the end page and in Claude's end-of-Session result.
- [ ] API error messages stay in English.
- [ ] The Facilitator tab has a selector limited to the two languages; Players see the change without reloading.
- [ ] API tests cover the setting, its permissions, persistence, `GRILL_LANG` and the Summary in each language; interface wording goes into the manual checklist of ticket 07.
