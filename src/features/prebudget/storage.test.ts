import { describe, expect, it } from "vitest";
import { createPrebudgetDraft } from "./draft";
import { createBrowserDraftStorage, PREBUDGET_DRAFT_KEY } from "./storage";

function memory(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return { get length() { return values.size; }, clear: () => values.clear(), getItem: (k) => values.get(k) ?? null, key: (i) => [...values.keys()][i] ?? null, removeItem: (k) => { values.delete(k); }, setItem: (k, v) => { values.set(k, v); } };
}

describe("성립전예산 임시저장", () => {
  it("학교명을 포함한 최신 초안을 저장하고 복원한다", () => {
    const adapter = createBrowserDraftStorage(memory());
    adapter.save({ ...createPrebudgetDraft("서울한빛초등학교"), title: "체험학습 성립전예산" });
    expect(adapter.load()).toMatchObject({ schoolName: "서울한빛초등학교", title: "체험학습 성립전예산" });
  });
  it("손상된 JSON은 제거하고 null을 반환한다", () => {
    const store = memory({ [PREBUDGET_DRAFT_KEY]: "{" });
    expect(createBrowserDraftStorage(store).load()).toBeNull();
    expect(store.getItem(PREBUDGET_DRAFT_KEY)).toBeNull();
  });
});
