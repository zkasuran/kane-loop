import { motion } from "framer-motion";

export function statusMeta(run) {
  if (!run) return { key: "idle", label: "Idle", color: "var(--muted)", icon: "•" };
  if (run.status === "running") return { key: "running", label: "Verifying", color: "var(--muted)", icon: "○" };
  if (run.status === "green") return { key: "green", label: "Green", color: "var(--good)", icon: "✓" };
  if (run.status === "stuck") return { key: "stuck", label: "Needs you", color: "var(--warning)", icon: "▲" };
  if (run.status === "failed" && run.patch?.files?.length) return { key: "patched", label: "Patched", color: "var(--series-1)", icon: "⟳" };
  return { key: "failed", label: "Failed", color: "var(--critical)", icon: "✕" };
}

export function StatTile({ label, value, sub }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}

// Status is never color-alone: every pill carries an icon and a word.
export function StatusPill({ meta, big }) {
  return (
    <span className={`pill${big ? " pill-big" : ""}`} style={{ "--pill": meta.color }}>
      <span className="pill-icon" aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export function LoopTape({ runs, selectedId, onSelect }) {
  return (
    <div className="tape" role="list" aria-label="verification runs">
      {runs.map((r) => {
        const meta = statusMeta(r);
        const active = r.id === selectedId;
        return (
          <motion.button
            key={r.id}
            role="listitem"
            className={`node${active ? " node-active" : ""}`}
            style={{ "--node": meta.color }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            onClick={() => onSelect(r.id)}
            title={`run #${r.id} — ${meta.label}`}
          >
            <span className="node-dot" aria-hidden="true">{meta.icon}</span>
            <span className="node-id">#{r.id}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function diffRows(before, after) {
  const A = (before || "").split("\n");
  const B = (after || "").split("\n");
  let s = 0;
  while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let a = A.length - 1;
  let b = B.length - 1;
  while (a >= s && b >= s && A[a] === B[b]) { a--; b--; }
  const ctx = 2;
  const rows = [];
  for (let i = Math.max(0, s - ctx); i < s; i++) rows.push({ t: " ", line: A[i] });
  for (let i = s; i <= a; i++) rows.push({ t: "-", line: A[i] });
  for (let i = s; i <= b; i++) rows.push({ t: "+", line: B[i] });
  for (let i = a + 1; i <= Math.min(A.length - 1, a + ctx); i++) rows.push({ t: " ", line: A[i] });
  return rows;
}

export function DiffView({ file }) {
  const rows = diffRows(file.before, file.after);
  return (
    <div className="diff">
      <div className="diff-path">{file.path}</div>
      <pre className="diff-body">
        {rows.map((r, i) => (
          <div key={i} className={`dl dl-${r.t === "+" ? "add" : r.t === "-" ? "del" : "ctx"}`}>
            <span className="dl-sign">{r.t}</span>
            <span className="dl-text">{r.line}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
