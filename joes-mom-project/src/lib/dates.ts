import { addDays, isWeekend } from "date-fns";

export function addBusinessDays(start: Date, daysToAdd: number): Date {
  let d = new Date(start);
  let added = 0;
  while (added < daysToAdd) {
    d = addDays(d, 1);
    if (!isWeekend(d)) added++;
  }
  return d;
}

export function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function formatShort(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleString();
}
