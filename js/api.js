const API = {
  getUrl()   { return localStorage.getItem('api_url')   || ''; },
  getToken() { return localStorage.getItem('api_token') || ''; },

  async call(action, params = {}) {
    const url   = this.getUrl();
    const token = this.getToken();
    if (!url || !token) throw new Error('Configure URL e Token primeiro.');

    const body = JSON.stringify({ action, token, ...params });

    // Usa text/plain para evitar preflight CORS no Apps Script
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow'
    });
    const txt = await resp.text();
    try {
      return JSON.parse(txt);
    } catch (e) {
      throw new Error('Resposta inválida do servidor: ' + txt.substring(0, 200));
    }
  }
};
