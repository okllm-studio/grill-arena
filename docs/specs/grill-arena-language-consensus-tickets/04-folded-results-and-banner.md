label: ready-for-agent

# 04: Folded results and Consensus banner

Spec: `docs/specs/grill-arena-language-consensus.md`. Vocabulary: `GLOSSARY.md` (Consensus, Near-consensus, Divided, Consensual Step).

**What to build:** the results of a closed Step show at a glance whether the group converged. Each Question is folded by default; a banner at the top of the Step says whether it was consensual. This applies to the results shown at closing and to the Results tab for past Steps.

- Folded Question: a colour mark (green Consensus, orange Near-consensus, red Divided, neutral grey not assessed) always accompanied by its text label; the Question Number and title; the Selected option with its letter, or "to re-ask"; the distribution in text including abstentions (for example "A 5 · B 1 · abst. 0"); an indicator when the Question has Comments.
- Unfolded Question: bars, Comments and the Player's own Vote.
- Banner: "Consensual Step" when every assessed Question is at Consensus; otherwise "N Questions out of M unanimous" (a Near-consensus is not unanimous); no banner when no Question is assessed (for example a Facilitator playing alone for the whole table).

**Blocked by:** 01 (Consensus levels in the API), 02 (Option letters).

**Status:** ready-for-agent

- [ ] Questions of a closed Step are folded by default and unfold on click.
- [ ] The folded line shows mark, text label, Selected option with letter (or "to re-ask"), text distribution and Comment indicator.
- [ ] The level is readable without colour.
- [ ] The banner reads "Consensual Step" or "N Questions out of M unanimous" from the server figures, and is hidden when no Question is assessed.
- [ ] A Question to re-ask and a Split vote show as Divided with no Selected option.
- [ ] The same folded view and banner appear in the Results tab for past Steps.
- [ ] No new computation in the browser: it renders what the server sends. Browser behaviour goes into the manual checklist of ticket 07.
