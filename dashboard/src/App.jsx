import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLoop } from "./useLoop.js";
import { statusMeta, StatTile, StatusPill, LoopTape, DiffView } from "./components.jsx";

const secs = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`);

export default function App() {
  const { runs, config, connected, balance } = useLoop();
  const [pinned, setPinned] = useState(null);

  const latest = runs[runs.length - 1] || null;
  const selectedId = pinned ?? latest?.id ?? null;
  const selected = runs.find((r) => r.id === selectedId) || latest;
  const hero = statusMeta(latest);

  // Follow the latest run unless the viewer has pinned one.
  useEffect(() => {
    if (pinned && !runs.some((r) => r.id === pinned)) setPinned(null);
  }, [runs, pinned]);

  const stats = useMemo(() => {
    const greens = runs.filter((r) => r.status === "green").length;
    const fixes = runs.filter((r) => r.patch?.files?.length).length;
    const credits = runs.reduce((n, r) => n + (Number(r.kane?.credits) || 0), 0);
    return { total: runs.length, greens, fixes, credits };
  }, [runs]);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true">↻</span>
          <div>
            <h1>kane-loop</h1>
            <p className="tag">your agent and Kane, talking until the app is green</p>
          </div>
        </div>
        <div className="live">
          <span className={`dot ${connected ? "on" : "off"}`} aria-hidden="true" />
          {connected ? "watching" : "offline"}
          {config?.flows?.[0] && <code>{config.flows[0].name}</code>}
        </div>
      </header>

      <section className="hero">
        <AnimatePresence mode="wait">
          <motion.div
            key={hero.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <StatusPill meta={hero} big />
          </motion.div>
        </AnimatePresence>
        <p className="hero-sub">
          {latest?.status === "green" && "Kane verified the flow in a real browser."}
          {latest?.status === "running" && "Running the flow in a real browser…"}
          {latest?.status === "failed" && latest?.patch && "Kane caught it. The agent pushed a fix; re-verifying."}
          {latest?.status === "stuck" && "The agent hit its attempt budget. Over to you."}
          {!latest && "Waiting for the first save."}
        </p>
      </section>

      <section className="tiles">
        <StatTile label="Runs" value={stats.total} />
        <StatTile label="Verified green" value={stats.greens} />
        <StatTile label="Auto-fixes" value={stats.fixes} />
        <StatTile label="Last run" value={secs(latest?.elapsedMs)} />
        {balance != null && <StatTile label="Kane credits left" value={balance.toLocaleString()} />}
      </section>

      <section className="tape-wrap">
        <h2>Loop tape</h2>
        <LoopTape runs={runs} selectedId={selectedId} onSelect={setPinned} />
      </section>

      {selected && <Detail run={selected} />}
    </div>
  );
}

function Detail({ run }) {
  const meta = statusMeta(run);
  const k = run.kane;
  return (
    <motion.section className="detail" key={run.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="detail-head">
        <h2>Run #{run.id}</h2>
        <span className="trigger">{run.trigger}</span>
        <StatusPill meta={meta} />
      </div>

      {k && (
        <div className="kane-line">
          <StatusPill meta={statusMeta({ status: k.status === "passed" ? "green" : "failed" })} />
          <span className="kane-text">{k.oneLiner || k.reason || k.flow}</span>
          {k.durationSec != null && <span className="kane-dur">{k.durationSec}s</span>}
        </div>
      )}
      {k?.status !== "passed" && k?.reason && <p className="reason">{k.reason}</p>}

      {run.patch?.files?.length ? (
        <div className="patch">
          <div className="patch-summary">
            <span className="patch-icon" aria-hidden="true">⟳</span>
            {run.patch.summary}
          </div>
          {run.patch.files.map((f) => (
            <DiffView key={f.path} file={f} />
          ))}
        </div>
      ) : null}

      {k?.evidence && <div className="evidence">evidence: <code>kane-cli evidence serve {k.evidence}</code></div>}
    </motion.section>
  );
}
