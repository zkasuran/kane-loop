# kane-loop

**Your coding agent and Kane CLI, talking on every save until the app is verified green.**

Built for the Kane CLI Online Hackathon (TestMu AI), 19 to 21 Aug 2026.

## The gap it closes

AI agents write code fast. The part that never closed: when the agent ships
something, a human still has to open a browser and click through to see if it
actually works. kane-loop closes that loop. On every save it runs your Kane CLI
flows in a real browser, and when one fails it hands the failure (the reason, the
observed value, the evidence) to your agent, which patches the code. The save
re-fires Kane. The app heals itself until Kane is green, with no human in the middle.

## What you get

- **A watcher** that re-verifies behavior on every save. Kane has no native watch
  mode; this adds one.
- **An agent bridge** that turns a Kane failure into a real code fix through an
  OpenAI-compatible model, with every edit confined to your app.
- **A live loop tape** at http://127.0.0.1:7799 showing every run: the Kane
  verdict, the failure reason, the agent's diff, the time to green.
- **A demo app** (a real unit converter) with a Kane browser flow plus a unit
  test, so you can watch the loop heal a regression end to end.

## The loop

```
save ─▶ kane-loop ─▶ kane-cli (real browser)
                         │
                pass ────┴──── fail
                 │              │
               green     agent reads the reason + evidence
                                │
                          patches code ─▶ (save) ─▶ back to Kane
```

## Quickstart

```bash
npm install
kane-cli login            # TestMu AI credentials, stored in ~/.testmuai
cp .env.example .env      # add your OpenAI-compatible endpoint + key
npm run build:dashboard
npm run loop              # watches demo/, serves the tape on :7799
```

Open http://127.0.0.1:7799, then edit `demo/src/convert.js` and break the
Celsius to Fahrenheit formula. Watch Kane catch it and the agent fix it.

<!-- MORE -->

## How the pieces fit

- `loop/`: the engine. `watcher` (chokidar) feeds `kane` (spawns `kane-cli run
  --agent --headless`, parses the NDJSON `run_end`); on failure it calls `agent`
  (the gateway patcher) and the file write re-triggers the watcher. `server`
  streams every event over SSE; `events` is the in-process bus.
- `dashboard/`: a Vite and React loop tape that subscribes to `/events`.
- `demo/`: the app under verification.
- `kane-loop.config.mjs`: your flows (plain-English objectives), the demo URL,
  the watch globs, the attempt budget.

## Kane CLI, specifically

kane-loop drives Kane in agent mode (`--agent --headless`), so every run is one
NDJSON stream ending in a `run_end` event it scripts against: `status`, `reason`,
`final_state`, `run_dir`, and the sealed `.evidence` pack. Flows are plain
English ("type 100 into Amount, set From to Celsius and To to Fahrenheit, click
Convert, assert the result shows 212"). No selectors, no framework.

The attempt budget in the config caps how many times the agent may try before it
stops and hands back to you, so a run can never loop forever or drain credits.

## Built with AI, on purpose

This project is about an AI agent verifying its own work, so it was built that
way. An AI coding agent wrote most of the code; a human designed it, reviewed it
and verified it. The self-heal in the demo is real: a real Kane run, a real
model, a real edit, a real green re-run. Nothing is mocked.

## License

MIT
