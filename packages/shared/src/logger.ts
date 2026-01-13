type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function getLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return "info";
}

export function createLogger(service: string) {
  const minLevel = getLevel();

  function shouldLog(level: LogLevel) {
    return levelOrder[level] >= levelOrder[minLevel];
  }

  function log(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
    if (!shouldLog(level)) return;
    const line = {
      ts: new Date().toISOString(),
      level,
      service,
      msg,
      ...extra
    };
    const out = JSON.stringify(line);
    if (level === "error") console.error(out);
    else console.log(out);
  }

  return {
    debug: (msg: string, extra?: Record<string, unknown>) => log("debug", msg, extra),
    info: (msg: string, extra?: Record<string, unknown>) => log("info", msg, extra),
    warn: (msg: string, extra?: Record<string, unknown>) => log("warn", msg, extra),
    error: (msg: string, extra?: Record<string, unknown>) => log("error", msg, extra)
  };
}
