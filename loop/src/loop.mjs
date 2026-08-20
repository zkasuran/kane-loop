import { spawn } from "node:child_process";
import path from "node:path";
import { emit, log } from "./events.mjs";
import { runKaneFlow } from "./kane.mjs";
import { startWatcher } from "./watcher.mjs";
import { startServer } from "./server.mjs";
import { proposeFix } from "./agent.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  return false;
}

function summarize(r) {
  if (!r) return null;
  return {
    flow: r.flow, status: r.status, oneLiner: r.oneLiner, reason: r.reason,
    durationSec: r.durationSec, credits: r.credits, runDir: r.runDir,
    evidence: r.evidence, testUrl: r.testUrl
  };
}

export async function startLoop(cfg) {
  const server = await startServer(cfg);
  log(`dashboard on http://127.0.0.1:${cfg.port}`);

  // Start the demo app's dev server so Kane has a live URL to drive.
  const demo = spawn(cfg.demoDevCmd.cmd, cfg.demoDevCmd.args, { cwd: cfg.demoDir, env: process.env });
  demo.stdout.on("data", (d) => process.stdout.write(`[demo] ${d}`));
  demo.stderr.on("data", (d) => process.stderr.write(`[demo] ${d}`));

  const up = await waitForUrl(cfg.demoUrl);
  log(up ? `demo live at ${cfg.demoUrl}` : `demo did not answer at ${cfg.demoUrl}`, up ? "info" : "warn");

  let running = false;
  let queued = false;
  let agentIters = 0;
  let expectAgentEdit = false;
  let iterId = 0;

  async function runPass(files, trigger) {
    const id = ++iterId;
    const started = Date.now();
    emit("run_start", { id, trigger, changedFiles: files });

    const results = [];
    for (const flow of cfg.flows) {
      emit("kane_start", { id, flow: flow.name });
      const r = await runKaneFlow(flow, { timeout: 150, maxSteps: 12 });
      emit("kane_end", { id, kane: summarize(r) });
      results.push(r);
    }

    const failedIndex = results.findIndex((r) => r.status !== "passed");
    if (failedIndex === -1) {
      emit("iteration", { id, status: "green", trigger, kane: summarize(results[0]),
        metrics: { elapsedMs: Date.now() - started } });
      agentIters = 0;
      return;
    }

    const failure = results[failedIndex];
    const flow = cfg.flows[failedIndex];

    if (agentIters >= cfg.maxIters) {
      emit("iteration", { id, status: "stuck", trigger, kane: summarize(failure),
        metrics: { elapsedMs: Date.now() - started } });
      emit("budget_exhausted", { id, agentIters });
      return;
    }

    agentIters += 1;
    emit("agent_start", { id, iter: agentIters, of: cfg.maxIters });
    let patch = null;
    try {
      patch = await proposeFix({ srcDir: path.join(cfg.demoDir, "src"), baseDir: cfg.demoDir, failure, flow });
      expectAgentEdit = patch.files.length > 0;
    } catch (e) {
      emit("agent_error", { id, message: e.message });
    }
    emit("iteration", {
      id, status: "failed", trigger,
      kane: summarize(failure),
      patch: patch ? { summary: patch.summary, files: patch.files } : null,
      iter: agentIters,
      metrics: { elapsedMs: Date.now() - started }
    });
    // Applied writes re-trigger the watcher → next pass.
  }

  async function onChange(files, trigger) {
    if (!expectAgentEdit && trigger !== "initial") agentIters = 0; // human edit = fresh budget
    expectAgentEdit = false;
    if (running) { queued = true; return; }
    running = true;
    try {
      await runPass(files, trigger);
    } catch (e) {
      emit("error", { message: e.message });
    } finally {
      running = false;
      if (queued) { queued = false; onChange([], "queued"); }
    }
  }

  const watcher = startWatcher(cfg, (files) => onChange(files, "save"));
  emit("watching", { dir: cfg.demoDir, flows: cfg.flows.map((f) => f.name) });

  await onChange([], "initial");

  const shutdown = () => {
    try { demo.kill(); } catch {}
    try { watcher.close(); } catch {}
    try { server.close(); } catch {}
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
