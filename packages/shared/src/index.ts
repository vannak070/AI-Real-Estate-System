import { randomUUID } from 'node:crypto';

/** Single id generator for the whole system (swap for ULID/KSUID here if wanted). */
export const newId = (): string => randomUUID();

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

/** Structured console logger. Replace with pino/winston without touching call sites. */
export function consoleLogger(bindings: Record<string, unknown> = {}): Logger {
  const line = (level: string, msg: string, meta?: Record<string, unknown>) =>
    JSON.stringify({ level, msg, time: new Date().toISOString(), ...bindings, ...meta });
  return {
    info: (msg, meta) => console.log(line('info', msg, meta)),
    warn: (msg, meta) => console.warn(line('warn', msg, meta)),
    error: (msg, meta) => console.error(line('error', msg, meta)),
    child: (extra) => consoleLogger({ ...bindings, ...extra }),
  };
}
