// src/data/supabaseRepo.ts
import { supabase } from '../lib/supabase';
import type { DataRepository, ToolDocument, ToolKind } from './types';

function uid() {
  return crypto.randomUUID();
}

export const supabaseRepo: DataRepository = {
  async listDocuments(tool?: ToolKind) {
    const q = supabase.from('tool_documents').select('*').order('updated_at', { ascending: false });
    const { data, error } = tool ? await q.eq('tool', tool) : await q;
    if (error) throw error;
    return (data ?? []) as ToolDocument[];
    },
  async getDocument(id: string) {
    const { data, error } = await supabase.from('tool_documents').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return (data as ToolDocument) ?? null;
  },
  async upsertDocument(doc) {
    const row = { ...doc, id: doc.id || uid() };
    const { data, error } = await supabase.from('tool_documents').upsert(row).select('*').single();
    if (error) throw error;
    return data as ToolDocument;
  },
  async deleteDocument(id: string) {
    const { error } = await supabase.from('tool_documents').delete().eq('id', id);
    if (error) throw error;
  },
  async getSetting(tool, key) {
    const { data, error } = await supabase.from('tool_settings')
      .select('value').eq('tool', tool).eq('key', key).maybeSingle();
    if (error) throw error;
    return data?.value ?? null;
  },
  async setSetting(tool, key, value) {
    const { error } = await supabase.from('tool_settings').upsert({ tool, key, value });
    if (error) throw error;
  },
};
