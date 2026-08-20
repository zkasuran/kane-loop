import { spawn } from "node:child_process";

/**
 * Run one Kane flow given as a plain-English objective (`kane-cli run`). Uses
 * --agent so stdout is NDJSON we can parse, and returns the terminal run_end
 * plus concrete failure detail the fixing agent can work from.
 */
export function runKaneFlow(flow, opts = {}) {
  const { timeout = 150, maxSteps = 12 } = opts;
  const args = ["run", flow.objective, "--agent", "--headless", "--timeout", String(timeout), "--max-steps", String(maxSteps)];
  if (flow.variables) args.push("--variables", JSON.stringify(flow.variables));
  return spawnKane(flow.name, args);
}

/**
 * Run a committed *_test.md flow (`kane-cli testmd run`). First run authors and
 * caches the plan; later runs replay from cache for free. Same NDJSON contract.
 */
export function runTestmd(name, path, opts = {}) {
  const { timeout = 150, maxSteps = 12 } = opts;
  const args = ["testmd", "run", path, "--agent", "--headless", "--timeout", String(timeout), "--max-steps", String(maxSteps)];
  return spawnKane(name, args);
}

function spawnKane(name, args) {
  return new Promise((resolve) => {
    const child = spawn("kane-cli", args, { env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) =>
      resolve({ flow: name, status: "error", reason: `Failed to spawn kane-cli: ${err.message}`, failedSteps: [], events: [], exitCode: null, evidence: null, durationSec: null })
    );
    child.on("close", (code) => resolve(finalize(name, parseNdjson(stdout), code, stderr)));
  });
}

function finalize(name, events, code, stderr) {
  const runEnd = events.find((e) => e.type === "run_end") || null;
  const status = runEnd?.status || (code === 0 ? "passed" : code === 3 ? "error" : "failed");
  const failedSteps = events
    .filter((e) => e.status === "failed")
    .map((e) => e.remark || e.summary || e.detail)
    .filter(Boolean);
  return {
    flow: name,
    status,
    oneLiner: runEnd?.one_liner || null,
    summary: runEnd?.summary || null,
    reason: runEnd?.reason || failedSteps.join("; ") || null,
    failedSteps,
    durationSec: runEnd?.duration ?? null,
    credits: runEnd?.credits ?? null,
    runDir: runEnd?.run_dir || null,
    sessionDir: runEnd?.session_dir || null,
    testUrl: runEnd?.test_url || null,
    finalState: runEnd?.final_state || null,
    evidence: parseEvidencePath(stderr),
    exitCode: code,
    events
  };
}

function parseNdjson(text) {
  const out = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t[0] !== "{") continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      /* non-JSON progress line, ignore */
    }
  }
  return out;
}

function parseEvidencePath(stderr) {
  const m = stderr.match(/evidence serve\s+(\S+\.evidence)/);
  return m ? m[1] : null;
}

/** Read remaining Kane credits (`kane-cli balance`). Returns a number or null. */
export function getBalance() {
  return new Promise((resolve) => {
    const child = spawn("kane-cli", ["balance"], { env: process.env });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));
    child.on("error", () => resolve(null));
    child.on("close", () => {
      const m = out.match(/Available credits:\s*([0-9,]+)/i);
      resolve(m ? Number(m[1].replace(/,/g, "")) : null);
    });
  });
}
