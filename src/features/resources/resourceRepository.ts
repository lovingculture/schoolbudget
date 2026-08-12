import type { BudgetResource, BudgetResourceInput, ResourceCategory } from "./resourceTypes";
import { canonicalMimeForFilename } from "./resourceUpload";

const RESOURCE_BUCKET = "budget-resources";
const RESOURCE_TABLE = "budget_resources";

type QueryResult<T> = { data: T | null; error: Error | null };
type ResourceRow = {
  id: string; title: string; description: string; category: ResourceCategory; school_year: number;
  original_filename: string; storage_path: string; mime_type: string; size_bytes: number;
  is_public: boolean; created_by: string; created_at: string; updated_at: string;
};

export type ResourceRepositoryClient = {
  storage: { from(bucket: string): { upload(path: string, file: File, options: { upsert: boolean; contentType: string }): Promise<QueryResult<unknown>>; remove(paths: string[]): Promise<QueryResult<unknown>>; download(path: string): Promise<QueryResult<Blob>> } };
  from(table: string): {
    select(columns: string): {
      order(column: string, options: { ascending: boolean }): Promise<QueryResult<ResourceRow[]>>;
      eq(column: string, value: boolean | string): {
      order(column: string, options: { ascending: boolean }): Promise<QueryResult<ResourceRow[]>>;
      maybeSingle(): Promise<QueryResult<Pick<ResourceRow, "storage_path">>>;
    } };
    insert(values: Record<string, unknown>): Promise<QueryResult<unknown>>;
    update(values: Record<string, unknown>): { eq(column: string, value: string): Promise<QueryResult<unknown>> };
    delete(): { eq(column: string, value: string): Promise<QueryResult<unknown>> };
  };
};

export class ResourceRepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "ResourceRepositoryError";
  }
}

function fileExtension(file: File) {
  return file.name.split(".").at(-1)?.toLowerCase() ?? "";
}

function storagePath(schoolYear: number, file: File) {
  return `${schoolYear}/${crypto.randomUUID()}.${fileExtension(file)}`;
}

function rowToResource(row: ResourceRow): BudgetResource {
  return {
    id: row.id, title: row.title, description: row.description, category: row.category, schoolYear: row.school_year,
    originalFilename: row.original_filename, storagePath: row.storage_path, mimeType: row.mime_type, sizeBytes: row.size_bytes,
    isPublic: row.is_public, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function metadata(input: BudgetResourceInput) {
  return {
    title: input.title.trim(), description: input.description?.trim() ?? "", category: input.category,
    school_year: input.schoolYear, is_public: input.isPublic ?? true,
  };
}

function fileMetadata(path: string, file: File) {
  return { original_filename: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size };
}

export function createResourceRepository(client: ResourceRepositoryClient) {
  const table = () => client.from(RESOURCE_TABLE);
  const bucket = () => client.storage.from(RESOURCE_BUCKET);

  async function upload(path: string, file: File) {
    try {
      const result = await bucket().upload(path, file, {
        upsert: false,
        contentType: canonicalMimeForFilename(file.name),
      });
      if (result.error) throw result.error;
    } catch (error) {
      throw new ResourceRepositoryError("파일을 업로드하지 못했습니다.", error);
    }
  }

  async function removeBestEffort(path: string) {
    try {
      const removal = await bucket().remove([path]);
      if (removal.error) throw removal.error;
    }
    catch { /* The original persistence error remains the useful error. */ }
  }

  return {
    async listAll(): Promise<BudgetResource[]> {
      try {
        const { data, error } = await table().select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map(rowToResource);
      } catch (error) {
        throw new ResourceRepositoryError("전체 자료를 불러오지 못했습니다.", error);
      }
    },

    async listPublic(): Promise<BudgetResource[]> {
      try {
        const { data, error } = await table().select("*").eq("is_public", true).order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map(rowToResource);
      } catch (error) {
        throw new ResourceRepositoryError("공개 자료를 불러오지 못했습니다.", error);
      }
    },

    async create(input: BudgetResourceInput, file: File, userId: string): Promise<void> {
      const path = storagePath(input.schoolYear, file);
      await upload(path, file);
      try {
        const insert = await table().insert({ ...metadata(input), ...fileMetadata(path, file), created_by: userId });
        if (insert.error) throw insert.error;
      } catch (error) {
        await removeBestEffort(path);
        throw new ResourceRepositoryError("자료 정보를 저장하지 못했습니다.", error);
      }
    },

    async update(id: string, input: BudgetResourceInput, replacementFile?: File): Promise<void> {
      let oldStoragePath: string | undefined;
      if (replacementFile) {
        try {
          const current = await table().select("storage_path").eq("id", id).maybeSingle();
          if (current.error || !current.data) throw current.error ?? new Error("resource not found");
          oldStoragePath = current.data.storage_path;
        } catch (error) {
          throw new ResourceRepositoryError("기존 파일 정보를 불러오지 못했습니다.", error);
        }
      }

      const replacementPath = replacementFile ? storagePath(input.schoolYear, replacementFile) : undefined;
      if (replacementFile && replacementPath) {
        await upload(replacementPath, replacementFile);
      }

      try {
        const update = await table().update({ ...metadata(input), ...(replacementFile && replacementPath ? fileMetadata(replacementPath, replacementFile) : {}) }).eq("id", id);
        if (update.error) throw update.error;
      } catch (error) {
        if (replacementPath) await removeBestEffort(replacementPath);
        throw new ResourceRepositoryError("자료 정보를 수정하지 못했습니다.", error);
      }

      if (oldStoragePath) await removeBestEffort(oldStoragePath);
    },

    async remove(resource: BudgetResource): Promise<void> {
      try {
        const storageRemoval = await bucket().remove([resource.storagePath]);
        if (storageRemoval.error) throw storageRemoval.error;
      } catch (error) {
        throw new ResourceRepositoryError("파일을 삭제하지 못했습니다.", error);
      }

      try {
        const deletion = await table().delete().eq("id", resource.id);
        if (deletion.error) throw deletion.error;
      } catch (error) {
        throw new ResourceRepositoryError("자료 정보를 삭제하지 못했습니다.", error);
      }
    },

    async download(resource: BudgetResource): Promise<void> {
      try {
        const result = await bucket().download(resource.storagePath);
        if (result.error || !result.data) throw result.error ?? new Error("empty download");
        const url = URL.createObjectURL(result.data);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = resource.originalFilename;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      } catch (error) {
        throw new ResourceRepositoryError("파일을 내려받지 못했습니다.", error);
      }
    },
  };
}

export type ResourceRepository = ReturnType<typeof createResourceRepository>;
