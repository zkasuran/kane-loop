import express from "express";
import path from "node:path";
import fs from "node:fs";
import { bus, getHistory } from "./events.mjs";

/**
 * Local-only server: serves the built dashboard and streams loop events over
 * SSE. Bound to 127.0.0.1 so the agent-driven control surface never faces the
 * network.
 */
export function startServer(cfg) {
  const app = express();
  const dashDist = path.join(cfg.repoRoot, "dashboard", "dist");
  const hasDash = fs.existsSync(path.join(dashDist, "index.html"));

  if (hasDash) app.use(express.static(dashDist));

  app.get("/api/state", (_req, res) => {
    res.json({ config: publicConfig(cfg), events: getHistory() });
  });

  app.get("/events", (req, res) => {
    res.set({
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });
    res.flushHeaders?.();
    for (const evt of getHistory()) res.write(`data: ${JSON.stringify(evt)}\n\n`);
    const onEvent = (evt) => res.write(`data: ${JSON.stringify(evt)}\n\n`);
    bus.on("event", onEvent);
    req.on("close", () => bus.off("event", onEvent));
  });

  app.get("*", (_req, res) => {
    if (hasDash) return res.sendFile(path.join(dashDist, "index.html"));
    res.type("text").send("kane-loop is running. Build the dashboard with `npm run build:dashboard`.");
  });

  return new Promise((resolve) => {
    const server = app.listen(cfg.port, "127.0.0.1", () => resolve(server));
  });
}

function publicConfig(cfg) {
  return {
    demoUrl: cfg.demoUrl,
    flows: cfg.flows.map((f) => ({ name: f.name, objective: f.objective })),
    maxIters: cfg.maxIters
  };
}
