// Mock data_sdk.js que usa a nossa nova API
window.dataSdk = {
  _dataHandler: null,
  _isInitialized: false,
  _previousData: null,

  async init(handler) {
    if (this._isInitialized) return { isOk: true };
    
    this._dataHandler = handler;
    console.log("Data SDK (API Mock) Inicializado");

    // Busca os dados iniciais e depois busca a cada 5 segundos (fallback)
    await this.fetchData();
    setInterval(() => this.fetchData(), 5000);

    this._isInitialized = true;
    return { isOk: true };
  },

  async fetchData() {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        console.error("Erro ao buscar dados:", response.statusText);
        return;
      }
      const data = await response.json();
      // Evita re-render desnecessário se os dados não mudaram
      const dataStr = JSON.stringify(data);
      const prevStr = JSON.stringify(this._previousData);
      if (dataStr !== prevStr) {
        this._previousData = data;
        if (this._dataHandler && typeof this._dataHandler.onDataChanged === 'function') {
          this._dataHandler.onDataChanged(data);
        }
      }
    } catch (error) {
      console.error("Falha na comunicação com o servidor:", error);
    }
  },

  async create(record) {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });
      if (!response.ok) {
        return { isOk: false, error: `HTTP error! status: ${response.status}` };
      }
      const result = await response.json();
      // Atualiza imediatamente os dados após criar
      await this.fetchData();
      return { isOk: true, id: result.id };
    } catch (error) {
      console.error("Erro ao criar registro:", error);
      return { isOk: false, error: error.message };
    }
  },

  async update(record) {
    try {
      const response = await fetch(`/api/data/${record.__backendId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });
      if (!response.ok) {
        return { isOk: false, error: `HTTP error! status: ${response.status}` };
      }
      const result = await response.json();
      // Atualiza imediatamente os dados após atualizar
      await this.fetchData();
      return result;
    } catch (error) {
      console.error("Erro ao atualizar registro:", error);
      return { isOk: false, error: error.message };
    }
  },

  async delete(record) {
    try {
      const response = await fetch(`/api/data/${record.__backendId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        return { isOk: false, error: `HTTP error! status: ${response.status}` };
      }
      const result = await response.json();
      // Atualiza imediatamente os dados após excluir
      await this.fetchData();
      return result;
    } catch (error) {
      console.error("Erro ao excluir registro:", error);
      return { isOk: false, error: error.message };
    }
  }
};
