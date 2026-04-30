# ADECOMPT — Sistema de Reserva de Computadores

[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=flat&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

Aplicação web para gerenciar reservas de computadores em laboratórios escolares. Interface moderna com suporte a múltiplos carrinhos, dispositivos, perfis de usuário e monitoramento em tempo real.

---

## 📋 Índice

- [Arquitetura](#arquitetura)
- [Stack Tecnológica](#stack-tecnológica)
- [Pré‑requisitos](#pré-requisitos)
- [Setup Local (Modo Legado)](#setup-local-modo-legado)
- [Setup com Supabase (Recomendado)](#setup-com-supabase-recomendado)
- [Deploy no Cloudflare Pages](#deploy-no-cloudflare-pages-grátis)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Guia de Migração](#guia-de-migração)

---

## 🏗️ Arquitetura

### Arquitetura Anterior (Legado)
```
Express Server (Node.js)
├── Frontend estático (HTML, CSS, JS)
├── REST API (/api/data/*)
└── data.json (arquivo)
```

### Nova Arquitetura (Recomendada)
```
┌─────────────────────────────────────────────────────┐
│              Cloudflare Pages (GRÁTIS)               │
│  Frontend estático + Supabase SDK (lado do cliente) │
│  ● CDN Global (330+ cidades)                        │
│  ● Bandwidth ilimitado                              │
│  ● HTTPS automático                                 │
└──────────────────────┬──────────────────────────────┘
                       │
         HTTPS (SDK)   │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Supabase (GRÁTIS)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  PostgreSQL   │  │    Auth      │  │  Realtime  │  │
│  │  (500MB free) │  │  (built-in)  │  │ (WebSocket)│  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│  ● Row-Level Security (RLS)                          │
│  ● Auto-gerado REST API                              │
│  ● Backup automático                                 │
└─────────────────────────────────────────────────────┘
```

### Custo Mensal: **$0**

| Camada | Serviço | Plano Gratuito |
|--------|---------|----------------|
| 🌐 Frontend | Cloudflare Pages | ∞ banda, ∞ requisições |
| 🗄️ Database | Supabase PostgreSQL | 500 MB |
| 🔐 Auth | Supabase Auth | 50.000 MAU |
| 🔄 Realtime | Supabase Realtime | 2M mensagens/mês |

---

## 🧰 Stack Tecnológica

- **Frontend:** HTML5, Tailwind CSS (CDN), Lucide Icons, Vanilla JS
- **Database:** PostgreSQL 15 (via Supabase)
- **Auth:** Supabase Auth (magic links, email/password, OAuth)
- **Realtime:** Supabase Realtime (WebSocket)
- **Hosting:** Cloudflare Pages
- **SDK:** `@supabase/supabase-js` (CDN)
- **Legacy:** Node.js + Express (para desenvolvimento local sem Supabase)

---

## 📦 Pré‑requisitos

- **Node.js** versão 18 ou superior — [Download](https://nodejs.org/)
- **npm** (incluído no Node.js)
- **Conta gratuita no Supabase** — [Criar conta](https://supabase.com)
- **Conta gratuita no Cloudflare** — [Criar conta](https://dash.cloudflare.com/sign-up)

---

## 🔧 Setup Local (Modo Legado)

Caso queira rodar localmente sem Supabase (usando o Express + `data.json`):

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor
node server.js

# 3. Acessar
# http://localhost:3000
```

> **⚠️ Atenção:** O modo legado não persiste dados entre deploys e não deve ser usado em produção.

---

## 🚀 Setup com Supabase (Recomendado)

### Passo 1: Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New project"**
3. Preencha:
   - **Name:** `adecompt`
   - **Database Password:** anote essa senha
   - **Region:** `South America (São Paulo)` — menor latência para o Brasil
4. Aguarde a criação do projeto (≈2 minutos)

### Passo 2: Aplicar o schema SQL

1. No painel do Supabase, vá para **SQL Editor**
2. Abra o arquivo [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
3. Copie e cole o conteúdo no SQL Editor
4. Clique em **"Run"** para executar

### Passo 3: Configurar Autenticação

1. No painel do Supabase, vá para **Authentication → Settings**
2. Em **"Sessions"**, configure:
   - **Session duration:** `2592000` (30 dias) — para não exigir login frequente
3. Vá para **Authentication → Users**
4. Clique em **"Add User"** e crie o admin:
   - **Email:** `admin@escola.com`
   - **Password:** `admin123`
   - Clique em **"Create user"**

### Passo 4: Configurar perfil do admin

1. No **SQL Editor**, execute:

```sql
update public.profiles
set name = 'Administrador',
    role = 'admin'
where email = 'admin@escola.com';
```

### Passo 5: Configurar o frontend

1. Abra o arquivo [`_sdk/supabase-client.js`](_sdk/supabase-client.js)
2. Substitua os valores de `SUPABASE_CONFIG`:
   - `url`: vá em **Project Settings → API → Project URL**
   - `anonKey`: vá em **Project Settings → API → anon/public key**

```javascript
const SUPABASE_CONFIG = {
  url: 'https://seu-projeto.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIs...'
};
```

### Passo 6: Popular dados iniciais

Execute o script [`supabase/seed.sql`](supabase/seed.sql) no SQL Editor do Supabase.

### Passo 7: Testar localmente

Você pode testar abrindo o arquivo `index.html` diretamente no navegador ou servindo com:

```bash
npx serve .
```

---

## 🌐 Deploy no Cloudflare Pages (Grátis)

### Opção A: Via Git (recomendado)

1. Crie um repositório no GitHub/GitLab
2. Envie o código:
```bash
git remote add origin https://github.com/seu-usuario/adecompt.git
git push -u origin main
```
3. Acesse [Cloudflare Pages](https://pages.cloudflare.com)
4. Clique em **"Create a project" → "Connect to Git"**
5. Selecione seu repositório
6. Configure:
   - **Framework preset:** `None`
   - **Build command:** `(deixe vazio)`
   - **Build output directory:** `/`
7. **Importante — Adicione as variáveis de ambiente:**
   - `VITE_SUPABASE_URL` = `https://seu-projeto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sua-chave-anon`
8. Clique em **"Save and Deploy"**

### Opção B: Via Upload Direto

1. Acesse Cloudflare Pages → **"Create a project" → "Upload"**
2. Faça upload de todos os arquivos do projeto
3. O deploy é automático

---

## 📁 Estrutura do Projeto

```
adelaide/
├── index.html                 # Página principal (frontend)
├── server.js                  # Servidor Express (legado — não necessário no Supabase)
├── package.json               # Dependências e metadados
├── package-lock.json
├── .env.example               # Template de variáveis de ambiente
├── .gitignore
├── README.md
│
├── _sdk/
│   ├── element_sdk.js         # SDK de elementos da interface (customização)
│   ├── supabase-client.js     # 🔥 NOVO — Configuração do cliente Supabase
│   └── data_sdk.js            # 🔥 MODIFICADO — Data layer (Supabase + fallback Express)
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   # 🔥 NOVO — Schema PostgreSQL + RLS
│   └── seed.sql                     # 🔥 NOVO — Dados iniciais
│
├── css/
│   └── style.css              # Estilos personalizados
│
└── js/
    └── script.js              # 🔥 MODIFICADO — Lógica do frontend (Auth c/ Supabase)
```

---

## 🔌 API Endpoints

> **Nota:** Com o Supabase, não é necessário usar os endpoints abaixo. O frontend comunica-se diretamente com o Supabase via SDK. Os endpoints abaixo são apenas para o modo legado (Express).

| Método | Rota             | Descrição                  |
|--------|------------------|----------------------------|
| GET    | `/api/data`      | Retorna todos os registros |
| POST   | `/api/data`      | Cria um novo registro      |
| PUT    | `/api/data/:id`  | Atualiza um registro       |
| DELETE | `/api/data/:id`  | Remove um registro         |

---

## 🔄 Guia de Migração

### Do Express para Supabase

| Conceito Antigo | Conceito Novo |
|----------------|---------------|
| `data.json` | PostgreSQL (tabelas: `profiles`, `carts`, `devices`, `reservations`, `school_periods`) |
| `__backendId` (numérico) | `id` (UUID) |
| Login com texto plano | Supabase Auth (bcrypt + JWT) |
| Polling a cada 5s | Supabase Realtime (WebSocket) |
| Servidor Express | Cliente direto → Supabase REST |
| `allData` array único | Consultas por tabela |

### Branch Git

O projeto utiliza Git Flow. A branch `feat/supabase-cloudflare-migration` contém todas as alterações da migração.

```bash
git checkout feat/supabase-cloudflare-migration
```

---

## 👨‍💻 Desenvolvimento

### Comandos úteis

```bash
# Servir localmente com servidor estático
npx serve .

# Servir com Express (modo legado)
npm start

# Verificar status Git
git status

# Ver diferenças da branch de migração
git diff main...feat/supabase-cloudflare-migration
```

---

## 📄 Licença

Distribuído sob a licença ISC. Consulte o arquivo `LICENSE` para mais detalhes.
