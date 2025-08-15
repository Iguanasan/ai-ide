// src/constants/auth.ts
const ALLOWED = 'marinerinnovations.com';
export function emailDomainOk(email: string) {
  const at = (email || '').toLowerCase().trim().split('@')[1] || '';
  return at === ALLOWED;
}
