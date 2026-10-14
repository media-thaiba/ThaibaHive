export * from "./types";
export * from "./edfi";
export * from "./oneroster";
export * from "./csv";

import type { SisAdapter } from "./types";
import { EdFiAdapter } from "./edfi";
import { OneRosterAdapter } from "./oneroster";
import { CsvAdapter } from "./csv";

export function getSisAdapter(standard: "edfi" | "oneroster" | "csv"): SisAdapter {
  switch (standard) {
    case "edfi":
      return new EdFiAdapter();
    case "oneroster":
      return new OneRosterAdapter();
    case "csv":
      return new CsvAdapter();
    default:
      throw new Error(`Unsupported SIS standard: ${standard}`);
  }
}
