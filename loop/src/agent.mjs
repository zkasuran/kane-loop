import fs from "node:fs";
import path from "node:path";
import { gateway } from "./config.mjs";

const SRC_EXT = /\.(jsx?|tsx?|css|html)$/;

/** Read the app's source (small) so the agent sees the whole surface. */
export function collectSource(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectSource(full, base));
    else if (SRC_EXT.test(entry.name)) {
      out.push({ path: path.relative(base, full), content: fs.readFileSync(full, "utf8") });
    }
  }
  return out;
}

const SYSTEM = `You are a senior web engineer fixing a small web app.
A browser verification tool called Kane just ran a real user flow in a real browser and it FAILED.
You get the failure detail, the value Kane observed, and the full current source. Return corrected file contents so the flow passes.
Rules:
- Fix the real cause. Change as little as possible. Never weaken, skip or delete the check to make it pass.
- Only return files you actually changed.
- Respond with STRICT JSON only, no prose, no markdown fences:
  {"summary":"one plain line: what you changed and why","files":[{"path":"<relative path>","content":"<full new file contents>"}]}`;

/** POST to the OpenAI-compatible gateway with retries; 5xx/524/429 are transient. */
async function callGateway({ baseURL, apiKey, model }, messages, { retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 2000,
          response_format: { type: "json_object" },
          messages
        }),
        signal: AbortSignal.timeout(90000)
      });
      if (res.ok) return await res.json();
      const body = (await res.text()).slice(0, 120);
      if (res.status >= 500 || res.status === 429) lastErr = new Error(`gateway ${res.status}`);
      else throw new Error(`gateway ${res.status}: ${body}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  throw lastErr || new Error("gateway failed");
}

/**
 * Ask the gateway for a fix, apply the changed files, and report the diff.
 * Writes are confined to the demo directory.
 */
export async function proposeFix({ srcDir, baseDir, failure, flow }) {
  const gw = gateway();
  const files = collectSource(srcDir, baseDir);
  const user = [
    `Flow objective: ${flow.objective}`,
    `Kane status: ${failure.status}`,
    `Kane reason: ${failure.reason || "(none)"}`,
    failure.finalState ? `Value Kane observed: ${JSON.stringify(failure.finalState)}` : "",
    failure.failedSteps?.length ? `Failed steps: ${failure.failedSteps.join(" | ")}` : "",
    "",
    "Current source files:",
    ...files.map((f) => `--- ${f.path} ---\n${f.content}`)
  ]
    .filter(Boolean)
    .join("\n");

  const data = await callGateway(gw, [
    { role: "system", content: SYSTEM },
    { role: "user", content: user }
  ]);
  const parsed = parseJson(data.choices?.[0]?.message?.content || "");

  const applied = [];
  for (const f of parsed.files || []) {
    const abs = path.resolve(baseDir, f.path);
    const rel = path.relative(baseDir, abs);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue; // never escape the demo
    const before = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
    if (before === f.content) continue;
    fs.writeFileSync(abs, f.content);
    applied.push({ path: f.path, before, after: f.content });
  }
  return { summary: parsed.summary || "patched", files: applied };
}

function parseJson(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  return JSON.parse(t);
}
