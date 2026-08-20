import { spawn } from "node:child_process";
import { runKaneFlow } from "./kane.mjs";

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

/**
 * Run every flow once against a freshly started demo server and report. Used by
 * the pre-push hook: exit non-zero if any flow fails, so a red build can't ship.
 */
export async function verifyOnce(cfg) {
  const demo = spawn(cfg.demoDevCmd.cmd, cfg.demoDevCmd.args, {
    cwd: cfg.demoDir,
    env: process.env,
    stdio: "ignore"
  });
  const up = await waitForUrl(cfg.demoUrl);
  if (!up) {
    demo.kill();
    console.error(`demo did not start at ${cfg.demoUrl}`);
    return false;
  }
  let ok = true;
  for (const flow of cfg.flows) {
    process.stdout.write(`  kane[${flow.name}] ... `);
    const r = await runKaneFlow(flow, { timeout: 150, maxSteps: 12 });
    console.log(r.status + (r.reason ? ` (${r.reason})` : ""));
    if (r.status !== "passed") ok = false;
  }
  demo.kill();
  return ok;
}
