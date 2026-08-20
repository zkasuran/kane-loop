import { EventEmitter } from "node:events";

// Single in-process bus. The loop writes events; the SSE server relays them.
export const bus = new EventEmitter();
bus.setMaxListeners(100);

const history = [];
const MAX_HISTORY = 500;

/**
 * Emit a typed event. Every event carries { type, ts } plus its payload.
 * Kept in a bounded ring buffer so a dashboard that connects mid-run can
 * replay what it missed.
 */
export function emit(type, data = {}) {
  const evt = { type, ts: new Date().toISOString(), ...data };
  history.push(evt);
  if (history.length > MAX_HISTORY) history.shift();
  bus.emit("event", evt);
  return evt;
}

export function getHistory() {
  return history.slice();
}

export function log(message, level = "info") {
  return emit("log", { message, level });
}
