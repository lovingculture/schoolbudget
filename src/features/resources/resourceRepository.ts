import type { BudgetResource, BudgetResourceInput, ResourceCategory } from "./resourceTypes";

const RESOURCE_BUCKET = "budget-resources";
const RESOURCE_TABLE = "budget_resources";

type QueryResult<T> = { data: T | null; error: Error | null };
type ResourceRow = {
  id: string; title: string; description: string; category: ResourceCategory; school_year: number;
  original_filename: string; storage_path: string; mime_type: string; size_bytes: number;
  is_public: boolean; created_by: string; created_at: string; updated_at: string;
};

type ResourceRepositoryClient = {
  storage: { from(bucket: string): { upload(path: string, file: File, options: { upsert: boolean }): Promise<QueryResult<unknown>>; remove(paths: string[]): Promise<QueryResult<unknown>> } };
  from(table: string): {
    select(columns: string): { eq(column: string, value: boolean): { order(column: string, options: { ascending: boolean }): Promise<QueryResult<ResourceRow[]>> } };
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

  return {
    async listPublic(): Promise<BudgetResource[]> {
      const { data, error } = await table().select("*").eq("is_public", true).order("created_at", { ascending: false });
      if (error) throw new ResourceRepositoryError("공개 자료를 불러오지 못했습니다.", error);
      return (data ?? []).map(rowToResource);
    },

    async create(input: BudgetResourceInput, file: File, userId: string): Promise<void> {
      const path = storagePath(input.schoolYear, file);
      const upload = await bucket().upload(path, file, { upsert: false });
      if (upload.error) throw new ResourceRepositoryError("파일을 업로드하지 못했습니다.", upload.error);

      const insert = await table().insert({ ...metadata(input), ...fileMetadata(path, file), created_by: userId });
      if (insert.error) {
        await bucket().remove([path]);
        throw new ResourceRepositoryError("자료 정보를 저장하지 못했습니다.", insert.error);
      }
    },

    async update(id: string, input: BudgetResourceInput, replacementFile?: File): Promise<void> {
      const replacementPath = replacementFile ? storagePath(input.schoolYear, replacementFile) : undefined;
      if (replacementFile && replacementPath) {
        const upload = await bucket().upload(replacementPath, replacementFile, { upsert: false });
        if (upload.error) throw new ResourceRepositoryError("파일을 업로드하지 못했습니다.", upload.error);
      }

      const update = await table().update({ ...metadata(input), ...(replacementFile && replacementPath ? fileMetadata(replacementPath, replacementFile) : {}) }).eq("id", id);
      if (update.error) {
        if (replacementPath) await bucket().remove([replacementPath]);
        throw new ResourceRepositoryError("자료 정보를 수정하지 못했습니다.", update.error);
      }
    },

    async remove(resource: BudgetResource): Promise<void> {
      const storageRemoval = await bucket().remove([resource.storagePath]);
      if (storageRemoval.error) throw new ResourceRepositoryError("파일을 삭제하지 못했습니다.", storageRemoval.error);

      const deletion = await table().delete().eq("id", resource.id);
      if (deletion.error) throw new ResourceRepositoryError("자료 정보를 삭제하지 못했습니다.", deletion.error);
    },
  };
}
