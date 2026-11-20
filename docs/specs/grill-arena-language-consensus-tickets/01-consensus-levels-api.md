label: ready-for-agent

# 01: Consensus levels in the API

Spec: `docs/specs/grill-arena-language-consensus.md`. Vocabulary: `GLOSSARY.md` (Consensus, Near-consensus, Divided, Consensual Step).

**What to build:** the server computes, for every closed Question, its Consensus level, and for every closed Step the figures needed for a banner. Players see them in their view of closed Steps, and Claude gets them in the closing result. Nothing is displayed yet; this ticket is verifiable through the API alone.

- Per Question, from cast Votes only (Abstentions and Players who did not answer are ignored): Consensus when all voters chose the same Option; Near-consensus when exactly one Vote differs from the rest; Divided otherwise, including a Split vote and any Question to re-ask; not assessed when fewer than two voters.
- Per Step: number of assessed Questions, number at Consensus, and a consensual flag set when every assessed Question is at Consensus. With no assessed Question, the Step has no consensus status.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A unanimous Question is at Consensus; one dissenting Vote gives Near-consensus; any other spread is Divided.
- [ ] A Split vote and a Question to re-ask are Divided.
- [ ] Abstentions and unanswered Players do not change the level.
- [ ] A Question with 0 or 1 voter is not assessed.
- [ ] The Step figures count only assessed Questions; a Near-consensus does not count as unanimous; the consensual flag is false if any assessed Question is not at Consensus; a Step with no assessed Question has no consensus status.
- [ ] Players see the levels and Step figures for closed Steps only, never before closing.
- [ ] The closing result returned to Claude carries the same data.
- [ ] API tests cover each case above; existing tests still pass.
