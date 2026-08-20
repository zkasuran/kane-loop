# Lane 4: requirements that test themselves

kane-loop uses Kane's assurance engine to turn the checkout PRD into a design, so
the tests trace back to the requirements instead of being made up.

## The pipeline

```bash
kane-cli context ingest demo/PRD.md --mode ci                 # land the PRD in .context/
kane-cli context extract --mode agent                         # mint use-cases from it
kane-cli design tests --use-case uc-1 --mode agent --max 2    # ACs and scenarios
kane-cli context list                                         # inspect the graph
```

## What it produced

Run against `demo/PRD.md` on this account:

- 1 use-case: "Complete a single-product purchase" (`uc-1`)
- 11 acceptance criteria
- 2 scenarios, with 2 coverage gaps flagged
- the full graph committed under `.context/`, content-addressed and verifiable
  with `kane-cli context fsck`

The committed browser test `tests/flows/checkout_test.md` verifies the headline
acceptance criterion: 2 units with SAVE25 and 10% tax comes to $66.00. kane-loop
replays it on every save and in CI.
