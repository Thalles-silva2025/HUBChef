import { createClient } from '@supabase/supabase-js';

// Helper to get env vars safely in Vite/Browser environment
const getEnv = (key: string) => {
  // Check import.meta.env (Vite standard)
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env) {
    return meta.env[key] || meta.env[`VITE_${key}`];
  }
  // Fallback for environments where process might exist (rare in pure Vite client)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`VITE_${key}`];
  }
  return undefined;
};

// Configuração do Cliente Supabase
// Prioriza variáveis de ambiente (VITE_SUPABASE_URL), mas mantém fallback hardcoded para a demo funcionar.
const SUPABASE_URL = getEnv('SUPABASE_URL') || 'https://lhlxzfszateddmpgqzaq.supabase.co';
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHh6ZnN6YXRlZGRtcGdxemFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzcwODQxMSwiZXhwIjoyMDgzMjg0NDExfQ.y0pmv8g_xqvQ91-V5e4bD2E3S1NRHklx6m_UaYvGw70';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase credentials missing. Check services/supabaseClient.ts');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);