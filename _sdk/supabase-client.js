/**
 * ADECOMPT - Supabase Client Configuration
 *
 * The credentials are loaded from env.js (gitignored) for security.
 *
 * Local development:
 *   1. Copy js/env.example.js as env.js (project root)
 *   2. Fill in your Supabase credentials
 *   3. Never commit env.js (it's in .gitignore)
 *
 * Cloudflare Pages:
 *   Generated automatically by build.js from environment variables
 *   SUPABASE_URL and SUPABASE_ANON_KEY configured in the dashboard.
 */

// ----------------------------------------------------------------
// Supabase Client Initialization
// Uses the global `supabase` from the CDN script loaded in index.html
// The CDN script exposes: window.supabase.createClient(url, anonKey)
// ----------------------------------------------------------------

let supabaseClient = null;

/**
 * Carrega a configuração do window.ADECOMPT_CONFIG
 * (definido em env.js ou gerado pelo build.js do Cloudflare Pages)
 */
function getSupabaseConfig() {
  const config = window.ADECOMPT_CONFIG;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
    console.warn(
      '⚠️  ADECOMPT_CONFIG não encontrado.\n' +
      '   Certifique-se de que o arquivo env.js foi carregado antes de supabase-client.js.\n' +
      '   Local:   copie env.example.js como env.js na raiz do projeto e preencha os dados\n' +
      '   Cloudflare: configure SUPABASE_URL e SUPABASE_ANON_KEY nas environment variables'
    );
    return null;
  }
  return config;
}

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

  const config = getSupabaseConfig();
  if (!config) return null;

  const { createClient } = window.supabase;
  supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
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
