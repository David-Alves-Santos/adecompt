# ADECOMPT — Guia de Convenções para Agentes

## Regras obrigatórias

### 1. Nunca use `onclick` inline no HTML
Sempre use `addEventListener` + atributos `data-*`. Ao renomear uma função, o erro fica explícito — não cria botão morto silencioso.

```js
// ❌ Errado
button.innerHTML = `<button onclick="deleteCart('${id}')">Excluir</button>`;

// ✅ Correto
button.dataset.cartId = id;
button.addEventListener('click', (e) => deleteCart(e.currentTarget.dataset.cartId));
```

### 2. Estado somente via objeto `state`
Não crie variáveis globais soltas. Todo estado da aplicação deve viver em um único objeto e ser alterado por funções dedicadas.

```js
// ❌ Errado
let currentUser = null;
let isLoading = false;

// ✅ Correto
state.currentUser = null;
state.set('isLoading', false);
```

### 3. Sempre rode os testes antes de commitar
```bash
npm test
```
Os testes devem passar com 0 falhas. Se você quebrar um teste, corrija antes de prosseguir.

### 4. Tratamento de erro em toda chamada ao Supabase
Use o wrapper `sdkCall()` ou um `try/catch` + `toast()` explícito. Nunca deixe uma promise estourar silenciosamente.

```js
// ❌ Errado
const { data } = await supabase.from('carts').select('*');

// ✅ Correto
try {
  const { data, error } = await supabase.from('carts').select('*');
  if (error) throw error;
} catch (err) {
  toast('❌ Erro ao carregar carrinhos.', 'error');
}
```

### 5. Modais de confirmação destrutiva exigem digitação do nome
Qualquer ação que apague dados permanentemente (carrinho, dispositivo com reservas, usuário) deve usar um modal customizado — nunca `window.confirm()` ou `window.prompt()`. Ver `confirmDeleteCart()` como referência.

---

## Estrutura do projeto

| Arquivo / Pasta | Responsabilidade |
|---|---|
| `js/script.js` | Toda a lógica da aplicação (a ser modularizado) |
| `js/script.test.js` | Testes unitários — rodar com `npm test` |
| `supabase/migrations/` | Migrations em ordem numérica (`001_`, `002_`, …) |
| `_sdk/` | SDK de dados (Express mode e Supabase mode) |
| `css/style.css` | Estilos globais (Tailwind via CDN + customizações) |

## Fluxo de trabalho com git

- Trabalho novo → branch a partir de `main`  
- `main` sempre estável e com testes passando  
- Nunca force-push em `main`  
- Migrations: prefixo numérico único (`003_`, `004_`…) — nunca dois arquivos com o mesmo número

## Stack

- Vanilla JS + HTML (sem framework frontend)
- Tailwind CSS via CDN
- Supabase (auth + banco) em produção
- Express + `data.json` em modo local/offline
- Node.js 18, sem bundler (arquivos servidos diretamente)
