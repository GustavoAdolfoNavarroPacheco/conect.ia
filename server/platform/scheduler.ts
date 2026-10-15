/**
 * Equivalente de `onSchedule` de Firebase. El horario real lo define
 * `vercel.json` → `crons`; el handler se invoca desde `api/cron/*`.
 */
export type ScheduledHandler = () => Promise<void>;

export function onSchedule(_opciones: unknown, handler: ScheduledHandler): { run: ScheduledHandler } {
  return { run: handler };
}
