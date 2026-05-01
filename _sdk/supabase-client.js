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
//
// IMPORTANTE:
//   url     = APENAS a URL base do projeto (ex: https://xxx.supabase.co)
//             NÃO adicione /rest/v1/ no final — o SDK gerencia isso automaticamente
//   anonKey = A chave "anon public" (começa com "eyJ...")
//
const SUPABASE_CONFIG = {
  url: 'https://ormtgxnlfrqybjjaneee.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ybXRneG5sZnJxeWJqamFuZWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDAzNDIsImV4cCI6MjA5MzIxNjM0Mn0.CEoTG1ruAz4lb6atu9bRHkGM_h0Dx4boDHXXDLgrTH0'
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
