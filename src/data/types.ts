// src/data/types.ts
export type ToolKind = 'csv-to-json' | 'markdown-notes' | 'agent-manager' | 'prompt-analyzer' | string;

export interface ToolDocument {
  id: string;
  tool: ToolKind;
  title: string;
  content: string;       // JSON or Markdown by tool
  created_at: string;
  updated_at: string;
  owner_user_id: string;
}

export interface ToolSetting {
  id: string;
  tool: ToolKind;
  key: string;
  value: unknown;
  owner_user_id: string;
  updated_at: string;
}

export interface DataRepository {
  // docs
  listDocuments(tool?: ToolKind): Promise<ToolDocument[]>;
  getDocument(id: string): Promise<ToolDocument | null>;
  upsertDocument(doc: Omit<ToolDocument, 'created_at' | 'updated_at'>): Promise<ToolDocument>;
  deleteDocument(id: string): Promise<void>;

  // settings
  getSetting(tool: ToolKind, key: string): Promise<unknown | null>;
  setSetting(tool: ToolKind, key: string, value: unknown): Promise<void>;
}
