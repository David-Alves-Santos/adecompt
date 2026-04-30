const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// ========== Persistência em Arquivo ==========
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { allData: parsed.allData || [], nextId: parsed.nextId || 1 };
    }
  } catch (err) {
    console.error('Erro ao carregar dados do arquivo:', err.message);
  }
  return { allData: [], nextId: 1 };
}

function saveData() {
  try {
    const tmpFile = DATA_FILE + '.tmp';
    const content = JSON.stringify({ allData, nextId }, null, 2);
    fs.writeFileSync(tmpFile, content, 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.error('❌ Erro ao salvar dados:', err.message);
  }
}

// Carrega dados salvos anteriormente (se existirem)
const persisted = loadData();
let allData = persisted.allData;
let nextId = persisted.nextId;

console.log(`📂 Dados carregados: ${allData.length} registro(s), próximo ID: ${nextId}`);

// Helper para encontrar índice por __backendId
function findIndexById(id) {
  return allData.findIndex(item => item.__backendId === id);
}

// Middlewares
app.use(express.json()); // Para parsear corpos de requisição JSON
app.use(express.static(path.join(__dirname, '.'))); // Para servir arquivos estáticos (HTML, CSS, JS)

// Rota principal para servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== API Endpoints ==========

// Endpoint para obter todos os dados (simulando o onDataChanged)
app.get('/api/data', (req, res) => {
  res.json(allData);
});

// Endpoint para criar um novo registro (usuário, reserva, etc.)
app.post('/api/data', (req, res) => {
  const newData = req.body;
  newData.__backendId = String(nextId++);
  newData.created_at = new Date().toISOString();
  allData.push(newData);
  saveData(); // Persiste imediatamente
  res.status(201).json({ isOk: true, id: newData.__backendId });
});

// Endpoint para atualizar um registro
app.put('/api/data/:id', (req, res) => {
  const id = req.params.id;
  const index = findIndexById(id);
  if (index === -1) {
    return res.status(404).json({ isOk: false, error: 'Registro não encontrado' });
  }
  const updatedData = req.body;
  // Preserve __backendId and created_at
  updatedData.__backendId = id;
  updatedData.created_at = allData[index].created_at;
  allData[index] = updatedData;
  saveData(); // Persiste imediatamente
  res.json({ isOk: true });
});

// Endpoint para excluir um registro
app.delete('/api/data/:id', (req, res) => {
  const id = req.params.id;
  const index = findIndexById(id);
  if (index === -1) {
    return res.status(404).json({ isOk: false, error: 'Registro não encontrado' });
  }
  allData.splice(index, 1);
  saveData(); // Persiste imediatamente
  res.json({ isOk: true });
});


app.listen(port, () => {
  console.log(`Servidor ouvindo na porta ${port}`);
});