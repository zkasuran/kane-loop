import { spawn } from "node:child_process";

/**
 * Run one Kane flow (a plain-English objective) in a real headless browser via
 * the kane-cli. Uses --agent so stdout is NDJSON we can parse, and returns the
 * terminal run_end plus concrete failure detail the agent can fix from.
 */
export function runKaneFlow(flow, { timeout = 150, maxSteps = 12 } = {}) {
  return new Promise((resolve) => {
    const args = [
      "run",
      flow.objective,
      "--agent",
      "--headless",
      "--timeout",
      String(timeout),
      "--max-steps",
      String(maxSteps)
    ];
    const child = spawn("kane-cli", args, { env: process.env });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      resolve({
        flow: flow.name,
        status: "error",
        reason: `Failed to spawn kane-cli: ${err.message}`,
        failedSteps: [],
        events: [],
        exitCode: null,
        evidence: null,
        durationSec: null
      });
    });

    child.on("close", (code) => {
      const events = parseNdjson(stdout);
      const runEnd = events.find((e) => e.type === "run_end") || null;
      const status =
        runEnd?.status || (code === 0 ? "passed" : code === 3 ? "error" : "failed");
      const failedSteps = events
        .filter((e) => e.status === "failed")
        .map((e) => e.remark || e.summary || e.detail)
        .filter(Boolean);
      resolve({
        flow: flow.name,
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
      });
    });
  });
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
