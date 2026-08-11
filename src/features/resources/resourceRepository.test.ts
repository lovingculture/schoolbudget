import { describe, expect, it, vi } from "vitest";
import { createResourceRepository } from "./resourceRepository";
import type { BudgetResource, BudgetResourceInput } from "./resourceTypes";

const input: BudgetResourceInput = {
  title: "2026 예산 편성 지침",
  description: "업무 참고용 지침",
  category: "guide",
  schoolYear: 2026,
  isPublic: true,
};

function resourceFile(name = "guide.pdf") {
  return new File(["resource"], name, { type: "application/pdf" });
}

function resource(overrides: Partial<BudgetResource> = {}): BudgetResource {
  return {
    id: "resource-1", title: input.title, description: input.description ?? "", category: "guide", schoolYear: 2026,
    originalFilename: "guide.pdf", storagePath: "2026/old.pdf", mimeType: "application/pdf", sizeBytes: 8,
    isPublic: true, createdBy: "admin-1", createdAt: "2026-08-11T00:00:00Z", updatedAt: "2026-08-11T00:00:00Z",
    ...overrides,
  };
}

function repositoryHarness() {
  const storage = {
    upload: vi.fn().mockResolvedValue({ data: { path: "uploaded" }, error: null }),
    remove: vi.fn().mockResolvedValue({ data: ["removed"], error: null }),
  };
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn(() => ({ eq: updateEq }));
  const deleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
  const deleteRows = vi.fn(() => ({ eq: deleteEq }));
  const order = vi.fn().mockResolvedValue({ data: [], error: null });
  const publicOnly = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq: publicOnly }));
  const table = { insert, update, delete: deleteRows, select };
  const client = { storage: { from: vi.fn(() => storage) }, from: vi.fn(() => table) };
  return { repository: createResourceRepository(client), client, storage, table, order, updateEq, deleteEq };
}

describe("createResourceRepository", () => {
  it("uploads a new resource under its school year before inserting its metadata", async () => {
    const { repository, storage, table } = repositoryHarness();
    const file = resourceFile();

    await repository.create(input, file, "admin-1");

    expect(storage.upload).toHaveBeenCalledWith(expect.stringMatching(/^2026\/[^/]+\.pdf$/), file, { upsert: false });
    expect(table.insert).toHaveBeenCalledWith(expect.objectContaining({ created_by: "admin-1", storage_path: expect.stringMatching(/^2026\/[^/]+\.pdf$/) }));
  });

  it("removes an uploaded file when inserting its metadata fails", async () => {
    const { repository, storage, table } = repositoryHarness();
    table.insert.mockResolvedValue({ data: null, error: new Error("insert failed") });

    await expect(repository.create(input, resourceFile(), "admin-1")).rejects.toThrow("자료 정보를 저장하지 못했습니다.");

    expect(storage.remove).toHaveBeenCalledWith([expect.stringMatching(/^2026\/[^/]+\.pdf$/)]);
  });

  it("updates resource metadata without uploading another file", async () => {
    const { repository, storage, table, updateEq } = repositoryHarness();

    await repository.update("resource-1", { ...input, title: "수정한 지침" });

    expect(storage.upload).not.toHaveBeenCalled();
    expect(table.update).toHaveBeenCalledWith(expect.objectContaining({ title: "수정한 지침" }));
    expect(updateEq).toHaveBeenCalledWith("id", "resource-1");
  });

  it("removes storage before deleting the metadata row", async () => {
    const { repository, storage, table, deleteEq } = repositoryHarness();

    await repository.remove(resource());

    expect(storage.remove).toHaveBeenCalledWith(["2026/old.pdf"]);
    expect(table.delete).toHaveBeenCalledTimes(1);
    expect(deleteEq).toHaveBeenCalledWith("id", "resource-1");
  });

  it("returns public rows as budget resources", async () => {
    const { repository, order } = repositoryHarness();
    order.mockResolvedValue({ data: [{
      id: "resource-1", title: "지침", description: "설명", category: "guide", school_year: 2026,
      original_filename: "guide.pdf", storage_path: "2026/guide.pdf", mime_type: "application/pdf", size_bytes: 12,
      is_public: true, created_by: "admin-1", created_at: "2026-08-11T00:00:00Z", updated_at: "2026-08-11T00:00:00Z",
    }], error: null });

    await expect(repository.listPublic()).resolves.toEqual([resource({ title: "지침", description: "설명", storagePath: "2026/guide.pdf", sizeBytes: 12 })]);
  });
});
