import { config as loadEnv } from "dotenv";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const engineDir = path.dirname(fileURLToPath(import.meta.url)); // loop/src
export const repoRoot = path.resolve(engineDir, "..", "..");

// House rule: the lane .env must win over any stale OPENAI_* already exported
// in the shell, or the agent silently talks to the wrong endpoint.
loadEnv({ path: path.join(repoRoot, ".env"), override: true });

export async function loadConfig() {
  const cfgPath = path.join(repoRoot, "kane-loop.config.mjs");
  const mod = await import(pathToFileURL(cfgPath).href);
  const cfg = mod.default;
  return {
    debounceMs: 450,
    maxIters: 6,
    maxAgentSecondsPerIter: 90,
    port: 7799,
    ...cfg,
    repoRoot,
    demoDir: path.resolve(repoRoot, cfg.demoDir)
  };
}

/**
 * Resolve the LLM gateway from the environment. OpenAI-compatible; the exact
 * host/key/model live only in .env, never in tracked code.
 */
export function gateway() {
  const baseURL = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!baseURL || !apiKey || !model) {
    throw new Error(
      "LLM gateway not configured. Set OPENAI_BASE_URL, OPENAI_API_KEY and OPENAI_MODEL in .env"
    );
  }
  return { baseURL: baseURL.replace(/\/$/, ""), apiKey, model };
}
