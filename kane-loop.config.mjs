export default {
  // The web app under verification (served by its own dev server).
  demoDir: "demo",
  demoUrl: "http://127.0.0.1:5178",
  demoDevCmd: { cmd: "npm", args: ["run", "dev"] },

  // Dashboard + SSE server.
  port: 7799,

  // Files whose changes trigger a verification pass.
  watch: ["src/**/*.{js,jsx,ts,tsx,css,html}"],
  debounceMs: 450,

  // Safety rails so the agent never loops forever or burns the budget.
  maxIters: 6,
  maxAgentSecondsPerIter: 90,

  // Kane flows. Each is a plain-English objective Kane runs in a real browser.
  // Kept as objectives (not committed _test.md) so the core loop always gets
  // stable NDJSON with a run_end event to script against.
  flows: [
    {
      name: "convert-happy-path",
      url: "http://127.0.0.1:5178",
      objective:
        "Go to http://127.0.0.1:5178, type 100 into the Amount field, choose Celsius as the From unit and Fahrenheit as the To unit, click Convert, store the shown result as 'result', and assert the result shows 212"
    }
  ]
};
