export type ResourceCategory = "guide" | "template" | "reference";

export type BudgetResource = {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  schoolYear: number;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BudgetResourceInput = {
  title: string;
  description?: string;
  category: ResourceCategory;
  schoolYear: number;
  isPublic?: boolean;
};
