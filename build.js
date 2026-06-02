/**
 * ADECOMPT - Build Script para Cloudflare Pages
 *
 * Gera o arquivo env.js na raiz do projeto a partir
 * de variáveis de ambiente configuradas no Cloudflare Pages.
 *
 * Variáveis aceitas (por ordem de precedência):
 *   1. SUPABASE_URL / SUPABASE_ANON_KEY
 *   2. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (prefixo VITE_ compatível)
 *
 * Configuração no Cloudflare Pages:
 *   Build command:       node build.js
 *   Build output dir:    /
 *   Environment variables (Settings > Environment variables):
 *     VITE_SUPABASE_URL       = https://ormtgxnlfrqybjjaneee.supabase.co
 *     VITE_SUPABASE_ANON_KEY  = eyJhbGciOiJIUzI1NiIs...
 */

const fs = require('fs');
const path = require('path');

// Aceita ambos os padrões de nomenclatura
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️  AVISO: Variáveis de ambiente SUPABASE_URL e/ou SUPABASE_ANON_KEY não definidas.');
  console.error('   O sistema tentará funcionar em modo legado (servidor Express).');
}

const envFile = `/**
 * ADECOMPT - Configuração gerada automaticamente pelo build.js
 * Não edite este arquivo manualmente.
 * Fonte: Cloudflare Pages Environment Variables
 */
window.ADECOMPT_CONFIG = {
  supabaseUrl: '${supabaseUrl.replace(/'/g, "\\'")}',
  supabaseAnonKey: '${supabaseAnonKey.replace(/'/g, "\\'")}'
};
`;

const outputPath = path.join(__dirname, 'env.js');
fs.writeFileSync(outputPath, envFile, 'utf8');
console.log('✅ env.js gerado com sucesso a partir das variáveis de ambiente.');
