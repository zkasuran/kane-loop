import chokidar from "chokidar";
import path from "node:path";

/**
 * Watch the demo app source and call onChange (debounced) with the changed
 * files. The loop decides whether a change came from a human editor or from
 * its own agent; the watcher just reports movement.
 */
export function startWatcher(cfg, onChange) {
  const globs = cfg.watch.map((g) => path.join(cfg.demoDir, g));
  const watcher = chokidar.watch(globs, {
    ignoreInitial: true,
    ignored: /node_modules|dist|\.git/
  });

  let pending = new Set();
  let timer = null;

  const fire = () => {
    const files = [...pending];
    pending = new Set();
    timer = null;
    if (files.length) onChange(files);
  };

  const bump = (file) => {
    pending.add(path.relative(cfg.demoDir, file));
    clearTimeout(timer);
    timer = setTimeout(fire, cfg.debounceMs);
  };

  watcher.on("change", bump).on("add", bump).on("unlink", bump);
  return watcher;
}
