import { createClient } from '@supabase/supabase-js';

// NOTA: Em produção, estas chaves devem vir de variáveis de ambiente (.env)
// Como este é um ambiente de geração de código, assumimos que o usuário preencherá.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lhlxzfszateddmpgqzaq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHh6ZnN6YXRlZGRtcGdxemFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzcwODQxMSwiZXhwIjoyMDgzMjg0NDExfQ.y0pmv8g_xqvQ91-V5e4bD2E3S1NRHklx6m_UaYvGw70';

if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
  console.warn('⚠️ Supabase URL not set. Please configure services/supabaseClient.ts');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);