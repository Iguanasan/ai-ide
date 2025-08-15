// src/data/index.ts
import type { DataRepository } from './types';
import { supabaseRepo } from './supabaseRepo';

let repo: DataRepository = supabaseRepo;
// later: swap to Azure by setting repo = azureRepo

export function getRepo(): DataRepository {
  return repo;
}
export function setRepo(next: DataRepository) {
  repo = next;
}
