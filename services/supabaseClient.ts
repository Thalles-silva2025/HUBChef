import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables in both Vite (import.meta.env) and standard Node/Process environments
const getEnvVar = (key: string) => {
  // Cast import.meta to any to avoid TypeScript error about 'env' property not existing on ImportMeta
  const meta = typeof import.meta !== 'undefined' ? (import.meta as any) : undefined;
  
  if (meta && meta.env && (meta.env[key] || meta.env[`VITE_${key}`])) {
    return meta.env[key] || meta.env[`VITE_${key}`];
  }
  if (typeof process !== 'undefined' && process.env && (process.env[key] || process.env[`VITE_${key}`])) {
    return process.env[key] || process.env[`VITE_${key}`];
  }
  return '';
};

// NOTA: Em produção, estas chaves devem vir de variáveis de ambiente.
const SUPABASE_URL = getEnvVar('SUPABASE_URL') || 'https://lhlxzfszateddmpgqzaq.supabase.co';
const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHh6ZnN6YXRlZGRtcGdxemFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzcwODQxMSwiZXhwIjoyMDgzMjg0NDExfQ.y0pmv8g_xqvQ91-V5e4bD2E3S1NRHklx6m_UaYvGw70';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase credentials not found. Check your environment variables.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);