import type { BudgetDataset, SchoolManifestEntry } from "./types";

export function validateSchoolManifest(value: unknown): SchoolManifestEntry[];
export function validateBudgetDataset(
  value: unknown,
  expectedEntry?: SchoolManifestEntry,
): BudgetDataset;
