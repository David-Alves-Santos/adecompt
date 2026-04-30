/**
 * ADECOMPT - Supabase Client Configuration
 *
 * This file initializes the Supabase client.
 * In production (Cloudflare Pages), set these environment variables
 * in the Cloudflare Pages dashboard:
 *   Settings > Environment variables
 *
 * For local development, create a .env file in the project root
 * (see .env.example).
 */

// ---- Configuration ----
// ⚠️ REPLACE these values with your Supabase project credentials
// Get them from: https://supabase.com > Project > Settings > API
const SUPABASE_CONFIG = {
  url: 'https://seu-projeto.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sua-chave-anon-aqui'
};

// ----------------------------------------------------------------
// Supabase Client Initialization
// Uses the global `supabase` from the CDN script loaded in index.html
// The CDN script exposes: window.supabase.createClient(url, anonKey)
// ----------------------------------------------------------------

let supabaseClient = null;

/**
 * Returns the initialized Supabase client singleton.
 * Must be called after the Supabase CDN script has loaded.
 */
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (typeof window.supabase === 'undefined') {
    console.error(
      '❌ Supabase SDK not loaded. Ensure the CDN script is included in index.html:\n' +
      '   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
    );
    return null;
  }

  const { createClient } = window.supabase;
  supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  });

  console.log('✅ Supabase client initialized');
  return supabaseClient;
}
