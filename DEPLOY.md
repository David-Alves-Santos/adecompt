# 🚀 Guia de Deploy Passo a Passo — ADECOMPT

## 📋 O que você vai fazer

```
1. Criar conta no Supabase          (5 minutos)
2. Configurar banco PostgreSQL       (3 minutos)
3. Criar usuário admin               (2 minutos)
4. Configurar o código do projeto    (3 minutos)
5. Fazer deploy no Cloudflare Pages  (10 minutos)
```

**Tempo total estimado:** 23 minutos
**Custo total:** R$ 0,00

---

## 🔹 Passo 1 — Criar Conta no Supabase

Abra o navegador e acesse: [https://supabase.com](https://supabase.com)

1. Clique em **"Start your project"**
2. Clique em **"Sign in with GitHub"** (mais rápido) ou **"Sign up with email"**
3. Se escolher GitHub, autorize o aplicativo
4. Verifique seu email (se necessário)

---

## 🔹 Passo 2 — Criar Projeto no Supabase

1. No painel do Supabase, clique em **"New project"**
2. Preencha:

   | Campo | Valor |
   |-------|-------|
   | **Name** | `adecompt` |
   | **Database Password** | Crie uma senha forte e **GUARDE ELA** (ex: `Adecompt@2026!`) |
   | **Region** | 🔴 **South America (São Paulo)** — essencial para velocidade |
   | **Pricing Plan** | **Free** (já selecionado) |

3. Clique em **"Create new project"**
4. ⏳ **Aguarde de 1 a 2 minutos** enquanto o banco é criado

---

## 🔹 Passo 3 — Aplicar o Schema do Banco

> ⚠️ **IMPORTANTE:** Use sempre o botão **"RUN"** (▶️), **NUNCA** o botão **"Explain"** (🔍). O "Explain" não funciona com múltiplos comandos.

### Parte A — Criar as 5 Tabelas

1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique em **"New query"**
3. Abra o arquivo [`supabase/migrations/001_tables.sql`](supabase/migrations/001_tables.sql) no VS Code
4. **Copie TODO o conteúdo** (Ctrl+A → Ctrl+C)
5. **Cole no SQL Editor** do Supabase (Ctrl+V)
6. ✅ **Clique em "RUN"** (▶️) — você verá "Success. No rows returned" (isso é normal para CREATE TABLE)
7. ⚠️ Se aparecer "Potential issue detected — Query has destructive operations", apenas clique em **"Run anyway"**

### Parte B — Adicionar Índices, Segurança (RLS) e Trigger

1. **"New query"** novamente
2. Abra o arquivo [`supabase/migrations/002_indexes_rls.sql`](supabase/migrations/002_indexes_rls.sql) no VS Code
3. Copie, cole e **clique em "RUN"** (▶️)
4. ✅ Pronto! Tabelas, índices, RLS e trigger estão configurados

---

## 🔹 Passo 4 — Criar Usuário Administrador

1. Menu lateral: **"Authentication"** → **"Users"**
2. Clique em **"Add User"**
3. Preencha:

   | Campo | Valor |
   |-------|-------|
   | **Email** | `admin@escola.com` |
   | **Password** | `admin123` |
   | **Auto Confirm User** | ✅ Marcado |

4. Clique em **"Create user"**

Agora torne-o administrador:

1. **"SQL Editor"** → **"New query"**
2. Execute:

```sql
update public.profiles
set name = 'Administrador',
    role = 'admin'
where email = 'admin@escola.com';
```

---

## 🔹 Passo 5 — Popular Dados Iniciais

1. **SQL Editor** → **"New query"**
2. Abra [`supabase/seed.sql`](supabase/seed.sql), copie o conteúdo, cole e execute
3. ✅ Dados carregados: 2 carrinhos, 2 dispositivos, horários padrão

---

## 🔹 Passo 6 — Pegar as Credenciais

1. Menu lateral: **"Project Settings"** (⚙️) → **"API"**
2. Copie:

   | O que copiar | Onde está | Exemplo |
   |---|---|---|
   | **Project URL** | Linha "Project URL" | `https://ormtgxnlfrqybjjaneee.supabase.co` |
   | **anon public key** | Linha "anon public", começa com `eyJ...` | `eyJhbGciOiJIUzI1NiIs...` |

3. ⚠️ **ATENÇÃO:** A URL é **apenas** a base do projeto (`https://xxx.supabase.co`).
   **NÃO** adicione `/rest/v1/` no final. O SDK do Supabase já gerencia os caminhos automaticamente.

---

## 🔹 Passo 7 — Configurar o Projeto

Agora as credenciais ficam em um arquivo separado [`env.js`](env.js) que **não** é enviado para o GitHub (está no `.gitignore`).

### Local (desenvolvimento)

1. Copie o arquivo de exemplo:
   ```
   copie js/env.example.js como env.js (raiz do projeto)
   ```
2. Abra o [`env.js`](env.js) e preencha com suas credenciais:

   ```javascript
   window.ADECOMPT_CONFIG = {
     supabaseUrl: 'https://ormtgxnlfrqybjjaneee.supabase.co',   // ← SEM /rest/v1/
     supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // ← anon public key
   };
   ```

3. ✅ Pronto! O [`env.js`](env.js) será carregado automaticamente pelo [`index.html`](index.html) antes do SDK.

> ⚠️ **Importante:**
> - **NUNCA** envie o `env.js` para o GitHub (já está no `.gitignore`)
> - A URL **não** deve conter `/rest/v1/` no final
> - Use a chave **"anon public"**, não a "service_role" key

---

## 🔹 Passo 8 — Enviar para o GitHub

**Se não tiver conta no GitHub:** [https://github.com](https://github.com) → Sign up

**Criar repositório:**
1. Clique no **"+"** (canto superior direito) → **"New repository"**
2. Nome: `adecompt`, **Público**, ❌ **desmarque** "Initialize with README"
3. Clique em **"Create repository"**

**No terminal do VS Code (Terminal → New Terminal), execute:**

```bash
git remote add origin https://github.com/SEU-USUARIO/adecompt.git
```

> Substitua `SEU-USUARIO` pelo seu nome do GitHub

```bash
git push -u origin main
```

```bash
git push -u origin feat/supabase-cloudflare-migration
```

---

## 🔹 Passo 9 — Deploy no Cloudflare Pages

1. Acesse [https://pages.cloudflare.com](https://pages.cloudflare.com)
2. **"Sign up"** (ou login) → plano **Free**
3. **"Create a project"** → **"Connect to Git"** → autorize GitHub
4. Selecione o repositório `adecompt`
5. Configure:

   | Campo | Valor |
   |-------|-------|
   | **Project name** | `adecompt` |
   | **Production branch** | `main` |
   | **Framework preset** | **None** |
   | **Build command** | `node build.js` |
   | **Build output directory** | `/` |
   | **Root directory** | (vazio) |

6. Role até **"Environment variables (advanced)"** e adicione:

   | Variable name | Value |
   |---|---|
   | `SUPABASE_URL` | `https://ormtgxnlfrqybjjaneee.supabase.co` |
   | `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |

   > ℹ️ O nome das variáveis é `SUPABASE_URL` e `SUPABASE_ANON_KEY` (sem `VITE_`).
   > O script [`build.js`](build.js) lê essas variáveis e gera o arquivo [`env.js`](env.js) automaticamente durante o deploy.

7. Clique em **"Save and Deploy"** 🚀

8. ✅ Aguarde 1-2 minutos. Seu site estará em `https://adecompt.pages.dev`

---

## 🔹 Passo 10 — Testar!

1. Abra `https://adecompt.pages.dev`
2. Login: `admin@escola.com` / `admin123`
3. ✅ Sistema funcionando!

---

## 🔹 Resolução de Problemas

| Erro | Causa | Solução |
|------|-------|---------|
| Tela em branco | URL ou key incorreta | Verifique [`_sdk/supabase-client.js`](_sdk/supabase-client.js) |
| Login não funciona | Usuário não criado | Vá em **Authentication → Users** e crie |
| "Failed to fetch" | CORS ou URL errada | Certifique-se que URL termina com `.supabase.co` |

---

## 📊 Checklist

- [ ] Conta Supabase criada
- [ ] Projeto `adecompt` (região São Paulo)
- [ ] Schema SQL executado
- [ ] Usuário admin criado e perfil atualizado
- [ ] Seed executado
- [ ] Credenciais copiadas
- [ ] `supabase-client.js` atualizado
- [ ] Código no GitHub
- [ ] Cloudflare Pages configurado
- [ ] Site funcionando! 🎉
