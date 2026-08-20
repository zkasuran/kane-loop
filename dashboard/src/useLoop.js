import { useEffect, useRef, useState } from "react";

/**
 * Subscribe to the loop engine's SSE stream and fold events into a list of
 * runs (one per verification pass) plus a rolling log. The server replays its
 * history on connect, so a late-loading dashboard catches up.
 */
export function useLoop() {
  const [runs, setRuns] = useState([]);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState(null);
  const [connected, setConnected] = useState(false);
  const runsRef = useRef(new Map());

  useEffect(() => {
    const m = runsRef.current;
    const flush = () => setRuns([...m.values()]);

    const apply = (evt) => {
      switch (evt.type) {
        case "run_start":
          m.set(evt.id, {
            id: evt.id, trigger: evt.trigger, ts: evt.ts, status: "running",
            kane: null, patch: null, agentIter: 0, elapsedMs: null
          });
          break;
        case "kane_end":
          if (m.has(evt.id)) m.get(evt.id).kane = evt.kane;
          break;
        case "agent_start":
          if (m.has(evt.id)) m.get(evt.id).agentIter = evt.iter;
          break;
        case "iteration": {
          const r = m.get(evt.id);
          if (r) {
            r.status = evt.status;
            r.patch = evt.patch || r.patch;
            r.kane = evt.kane || r.kane;
            r.elapsedMs = evt.metrics?.elapsedMs ?? r.elapsedMs;
          }
          break;
        }
        case "log":
          setLogs((l) => [...l.slice(-99), evt]);
          return;
        default:
          return;
      }
      flush();
    };

    const es = new EventSource("/events");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try { apply(JSON.parse(e.data)); } catch { /* ignore */ }
    };
    fetch("/api/state").then((r) => r.json()).then((d) => setConfig(d.config)).catch(() => {});
    return () => es.close();
  }, []);

  return { runs, logs, config, connected };
}
