# ADECOMPT - Sistema de Reserva de Computadores

Este projeto é uma aplicação web para gerenciar reservas de computadores em um laboratório. A interface é construída com HTML, CSS e JavaScript no frontend, e um servidor Node.js/Express no backend.

## Pré‑requisitos

- **Node.js** (versão 18 ou superior) – [Download Node.js](https://nodejs.org/)
- **npm** (gerenciador de pacotes, já incluso no Node.js)

## Instalação

1. Clone este repositório ou copie os arquivos para uma pasta local.
2. Abra um terminal na pasta raiz do projeto (`c:/Users/prati/OneDrive/Área de Trabalho/adelaide`).
3. Execute o comando abaixo para instalar as dependências:

```bash
npm install
```

As dependências (principalmente `express`) serão baixadas e instaladas na pasta `node_modules`.

## Executando o projeto

1. Com as dependências instaladas, inicie o servidor com:

```bash
node server.js
```

2. O terminal exibirá a mensagem:
   ```
   Servidor ouvindo na porta 3000
   ```

3. Acesse a aplicação no navegador:
   - URL: [http://localhost:3000](http://localhost:3000)

4. A tela de login será carregada. Use as credenciais apropriadas (consulte o administrador do sistema para obter acesso).

## Estrutura do projeto

```
adelaide/
├── index.html          # Página principal (frontend)
├── server.js           # Servidor Node.js/Express
├── package.json        # Dependências e metadados do projeto
├── package-lock.json   # Versões exatas das dependências
├── css/
│   └── style.css       # Estilos personalizados
├── js/
│   └── script.js       # Lógica de interação do frontend
└── _sdk/
    ├── element_sdk.js  # SDK para elementos da interface
    └── data_sdk.js     # SDK para comunicação com a API
```

## API Endpoints (Backend)

O servidor fornece os seguintes endpoints REST:

- `GET /api/data` – retorna todos os dados armazenados em memória
- `POST /api/data` – adiciona um novo registro
- `PUT /api/data/:id` – atualiza um registro existente
- `DELETE /api/data/:id` – remove um registro

Os dados são mantidos em memória (não persistem após reiniciar o servidor).

## Parando o servidor

No terminal onde o servidor está rodando, pressione **Ctrl+C**.

## Solução de problemas

- **Erro "Port already in use"**: A porta 3000 pode estar ocupada por outro processo. Altere a porta no arquivo `server.js` (linha 4) e recarregue.
- **Dependências não instaladas**: Certifique‑se de que o comando `npm install` foi executado sem erros.
- **Página não carrega**: Verifique se o servidor está em execução (`node server.js`) e se a URL está correta.

## Contribuição

Este projeto foi desenvolvido para fins educacionais/demonstrativos. Para sugerir melhorias, entre em contato com a equipe responsável.

## Licença

Distribuído sob a licença ISC. Consulte o arquivo `LICENSE` (se existente) para mais detalhes.