/**
 * ADECOMPT - Build Script para Cloudflare Pages
 *
 * Gera o arquivo env.js na raiz do projeto a partir
 * de variáveis de ambiente configuradas no Cloudflare Pages.
 *
 * Variáveis esperadas (configurar no dashboard do Cloudflare Pages):
 *   SUPABASE_URL       - URL do projeto Supabase (ex: https://xxx.supabase.co)
 *   SUPABASE_ANON_KEY  - Chave anon public do Supabase
 *
 * Configuração no Cloudflare Pages:
 *   Build command:       node build.js
 *   Build output dir:    /
 *   Environment variables (adicionar em Settings > Environment variables):
 *     SUPABASE_URL       = https://ormtgxnlfrqybjjaneee.supabase.co
 *     SUPABASE_ANON_KEY  = eyJhbGciOiJIUzI1NiIs...
 */

const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

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
