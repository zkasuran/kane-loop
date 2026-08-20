#!/usr/bin/env node
import { loadConfig } from "../src/config.mjs";
import { startLoop } from "../src/loop.mjs";
import { bus } from "../src/events.mjs";

const cmd = process.argv[2] || "watch";

// A concise live "loop tape" in the terminal, mirroring the dashboard.
function printer(evt) {
  switch (evt.type) {
    case "log":
      console.log(`  · ${evt.message}`);
      break;
    case "run_start":
      console.log(`\n▶ run #${evt.id} (${evt.trigger})`);
      break;
    case "kane_end":
      console.log(
        `  kane[${evt.kane.flow}]: ${evt.kane.status}` +
          (evt.kane.reason ? ` — ${evt.kane.reason}` : "")
      );
      break;
    case "agent_start":
      console.log(`  🤖 agent fixing (attempt ${evt.iter}/${evt.of})`);
      break;
    case "agent_error":
      console.log(`  ✖ agent error: ${evt.message}`);
      break;
    case "iteration":
      if (evt.status === "green") console.log(`  ✅ GREEN in run #${evt.id}`);
      else if (evt.status === "stuck") console.log(`  ⚠ stuck after ${evt.iter} attempts`);
      else if (evt.patch)
        console.log(
          `  ✎ patched: ${evt.patch.summary} (${evt.patch.files.map((f) => f.path).join(", ")})`
        );
      break;
  }
}

if (cmd === "watch") {
  const cfg = await loadConfig();
  bus.on("event", printer);
  console.log(`kane-loop: watching ${cfg.demoDir}`);
  await startLoop(cfg);
} else if (cmd === "verify") {
  const cfg = await loadConfig();
  const { verifyOnce } = await import("../src/verify.mjs");
  const ok = await verifyOnce(cfg);
  console.log(ok ? "all flows passed" : "flows failed");
  process.exit(ok ? 0 : 1);
} else if (cmd === "--version" || cmd === "-v") {
  console.log("kane-loop 0.1.0");
} else {
  console.log("usage: kane-loop <watch|verify>");
  process.exit(1);
}
