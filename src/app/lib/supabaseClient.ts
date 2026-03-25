import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL and a key (VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY or VITE_SUPABASE_ANON_KEY)',
  );
}

export const supabase = createClient(url, key);
