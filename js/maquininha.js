/*******************************************************
 *  MAQUININHA - WI-FI / CLOUD / BLUETOOTH
 *******************************************************/

// ---------- Seleção de modo ----------
function mostrarModoMaquininha() {
  const modo = document.getElementById('modoMaquininha').value;
  localStorage.setItem('modo_maquininha', modo);

  document.getElementById('boxWifi').style.display      = (modo === 'WIFI')      ? 'block' : 'none';
  document.getElementById('boxCloud').style.display     = (modo === 'CLOUD')     ? 'block' : 'none';
  document.getElementById('boxBluetooth').style.display = (modo === 'BLUETOOTH') ? 'block' : 'none';
}

// ---------- Wi-Fi Local (teste de rede) ----------
async function testarWifiLocal() {
  const ip    = document.getElementById('wifiIp').value.trim();
  const porta = document.getElementById('wifiPorta').value.trim() || '8080';
  const box   = document.getElementById('wifiResultado');

  if (!ip) { box.innerHTML = '<p style="color:red">Digite o IP</p>'; return; }
  box.innerHTML = '<p>⏳ Testando <code>http://' + ip + ':' + porta + '</code>...</p>';

  const url = 'http://' + ip + ':' + porta + '/';
  const t0  = performance.now();

  try {
    // fetch com AbortController (timeout 3s)
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);

    // no-cors: só para saber se a porta responde (não lê conteúdo)
    await fetch(url, { mode: 'no-cors', signal: ctrl.signal });
    clearTimeout(timer);

    const ms = Math.round(performance.now() - t0);
    box.innerHTML = `
      <p style="color:#2e7d32">✅ <strong>Porta acessível!</strong> (${ms}ms)</p>
      <p style="font-size:12px;color:#666">
        A maquininha respondeu. Se a integração automática de cobrança não funcionar,
        use o modo <strong>☁️ PagSeguro Cloud</strong> — é o único caminho oficial.
      </p>`;
  } catch (e) {
    box.innerHTML = `
      <p style="color:#c62828">❌ Não foi possível acessar.</p>
      <p style="font-size:12px;color:#666">
        <strong>Motivo comum:</strong> a Minizinha Chip 3 <u>não expõe porta HTTP</u>
        na rede local por segurança (PCI-DSS). Ela só fala com a nuvem da PagSeguro.<br><br>
        <strong>Solução:</strong> use o modo <strong>☁️ PagSeguro Cloud</strong>.
      </p>`;
  }
}

// ---------- PagSeguro Cloud ----------
async function salvarCredenciaisPS() {
  const email = document.getElementById('psEmail').value.trim();
  const token = document.getElementById('psToken').value.trim();
  if (!email || !token) return alert('Preencha e-mail e token');

  localStorage.setItem('ps_email', email);
  localStorage.setItem('ps_token', token);

  const r = await API.call('salvarCredenciaisPagSeguro', { email, token });
  document.getElementById('cloudResultado').innerHTML = r.ok
    ? '<p style="color:#2e7d32">✅ Credenciais salvas no Sheets.</p>'
    : '<p style="color:#c62828">❌ ' + r.error + '</p>';
}

async function statusPS() {
  const box = document.getElementById('cloudResultado');
  box.innerHTML = '<p>⏳ Consultando...</p>';
  const r = await API.call('statusMaquininhaPagSeguro');
  if (!r.ok) { box.innerHTML = '<p style="color:#c62828">❌ ' + (r.error || r.body) + '</p>'; return; }

  try {
    const j = JSON.parse(r.body);
    const terminais = j.terminals || [];
    if (!terminais.length) {
      box.innerHTML = '<p>Nenhum terminal pareado. Pareie a Minizinha no painel PagSeguro.</p>';
      return;
    }
    box.innerHTML = '<h4>Terminais:</h4><ul>' + terminais.map(t =>
      `<li>${t.label || t.id} — ${t.status || '?'}</li>`).join('') + '</ul>';
  } catch (e) {
    box.innerHTML = '<p>' + r.body + '</p>';
  }
}

async function testarCobrancaPS() {
  const box = document.getElementById('cloudResultado');
  if (!confirm('Criar cobrança de teste de R$ 1,00? (será enviada à maquininha)')) return;

  box.innerHTML = '<p>⏳ Criando cobrança...</p>';
  const r = await API.call('criarCobrancaPagSeguro', {
    valor: 1.00,
    metodo: 'PIX',
    descricao: 'Teste de integração'
  });
  box.innerHTML = r.ok
    ? '<p style="color:#2e7d32">✅ Cobrança criada! Confira na maquininha.</p><pre style="font-size:11px;overflow:auto">' + r.body + '</pre>'
    : '<p style="color:#c62828">❌ ' + (r.error || r.body) + '</p>';
}

// ---------- Cobrança real (chamada na venda) ----------
async function enviarParaMaquininha(total, metodo) {
  const modo = localStorage.getItem('modo_maquininha') || 'MANUAL';

  if (modo === 'MANUAL' || modo === 'BLUETOOTH') {
    console.log('Modo ' + modo + ' — venda só será registrada.');
    return { ok: true, modo };
  }

  if (modo === 'WIFI') {
    // Wi-Fi local puro não funciona na Minizinha Chip 3 (ver testarWifiLocal)
    // Cai automaticamente no Cloud se configurado
    if (!localStorage.getItem('ps_token')) {
      return { ok: false, error: 'Minizinha não aceita comandos por Wi-Fi local. Configure PagSeguro Cloud.' };
    }
    // continua para Cloud
  }

  if (modo === 'CLOUD' || (modo === 'WIFI' && localStorage.getItem('ps_token'))) {
    try {
      const r = await API.call('criarCobrancaPagSeguro', {
        valor: total,
        metodo,
        descricao: 'Venda Igreja'
      });
      return r;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  return { ok: true };
}
