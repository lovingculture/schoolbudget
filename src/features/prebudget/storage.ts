import { normalizePrebudgetDraft } from "./draft";
import type { PrebudgetFormDraft } from "./types";

export const PREBUDGET_DRAFT_KEY = "school-budget-portal:prebudget-draft:v1";
export interface DraftStorage { load(): PrebudgetFormDraft | null; save(draft: PrebudgetFormDraft): void; clear(): void; }

export function createBrowserDraftStorage(storage: Storage = window.localStorage): DraftStorage {
  return {
    load() {
      const raw = storage.getItem(PREBUDGET_DRAFT_KEY);
      if (!raw) return null;
      try { return normalizePrebudgetDraft(JSON.parse(raw)); }
      catch { storage.removeItem(PREBUDGET_DRAFT_KEY); return null; }
    },
    save(draft) { storage.setItem(PREBUDGET_DRAFT_KEY, JSON.stringify(draft)); },
    clear() { storage.removeItem(PREBUDGET_DRAFT_KEY); },
  };
}
