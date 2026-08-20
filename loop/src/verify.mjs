import { spawn } from "node:child_process";
import path from "node:path";
import { runKaneFlow, runTestmd } from "./kane.mjs";

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
 * Run the committed regression suite once against a freshly started demo server
 * and report. Prefers the committed _test.md flows (cached replay, free after
 * the first run); falls back to the live objectives. Used by the pre-push hook
 * and CI: exit non-zero if any flow fails, so a red build cannot ship.
 */
export async function verifyOnce(cfg) {
  const demo = spawn(cfg.demoDevCmd.cmd, cfg.demoDevCmd.args, { cwd: cfg.demoDir, env: process.env, stdio: "ignore" });
  const up = await waitForUrl(cfg.demoUrl);
  if (!up) {
    demo.kill();
    console.error(`demo did not start at ${cfg.demoUrl}`);
    return false;
  }

  const testmd = cfg.testmd || [];
  const items = testmd.length
    ? testmd.map((p) => ({ name: path.basename(p).replace(/_test\.md$/, ""), path: p }))
    : cfg.flows.map((f) => ({ name: f.name, flow: f }));

  let ok = true;
  for (const it of items) {
    process.stdout.write(`  kane[${it.name}] ... `);
    const r = it.path ? await runTestmd(it.name, it.path) : await runKaneFlow(it.flow);
    console.log(r.status + (r.reason ? ` (${r.reason})` : ""));
    if (r.status !== "passed") ok = false;
  }
  demo.kill();
  return ok;
}
