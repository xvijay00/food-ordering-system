export type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  requestId?: string;
  endpoint?: string;
  durationMs?: number;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, payload?: LogPayload): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...payload,
  };
  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, payload?: LogPayload): void {
    console.log(formatLog("info", message, payload));
  },
  warn(message: string, payload?: LogPayload): void {
    console.warn(formatLog("warn", message, payload));
  },
  error(message: string, error?: unknown, payload?: LogPayload): void {
    const errorDetails =
      error instanceof Error
        ? { errorMessage: error.message, errorName: error.name }
        : error !== undefined
          ? { errorMessage: String(error) }
          : {};

    console.error(
      formatLog("error", message, {
        ...payload,
        ...errorDetails,
      })
    );
  },
};

