export const INSURERS = [
  "UNITED HEALTH CARE",
  "MERITAIN HEALTH",
  "MAGNACARE",
  "Fep BC BS",
  "ANTHEM",
  "CIGNA",
  "AETNA",
  "EMBLEM",
  "CONNETICARE",
  "EMBLEM HIP",
] as const;
export type InsurerName = (typeof INSURERS)[number];
