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
  // Live self-heal flows: plain-English objectives run with `kane-cli run`.
  flows: [
    {
      name: "checkout-total",
      url: "http://127.0.0.1:5178",
      objective:
        "Go to http://127.0.0.1:5178, set the Quantity field to 2, type {{promo}} into the Promo code field, click Apply, store the shown Total as 'total', and assert the Total shows $66.00",
      // Kane substitutes {{promo}} from here. Mark secrets with secret: true.
      variables: { promo: { value: "SAVE25" } }
    }
  ],

  // Committed _test.md flows for the pre-push hook and CI. First run authors and
  // caches the plan; every later run replays from cache for free.
  testmd: ["tests/flows/checkout_test.md"]
};
