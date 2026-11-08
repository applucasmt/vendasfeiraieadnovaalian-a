/*******************************************************
 *  MAQUININHA - WI-FI / CLOUD / BLUETOOTH / PIX QR CODE
 *  Versão: 3.1 (Com validação de token PagBank)
 *******************************************************/

// =====================================================
//  SELEÇÃO DE MODO
// =====================================================
function mostrarModoMaquininha() {
  const modo = document.getElementById('modoMaquininha').value;
  localStorage.setItem('modo_maquininha', modo);

  document.getElementById('boxWifi').style.display      = (modo === 'WIFI')      ? 'block' : 'none';
  document.getElementById('boxCloud').style.display     = (modo === 'CLOUD')     ? 'block' : 'none';
  document.getElementById('boxBluetooth').style.display = (modo === 'BLUETOOTH') ? 'block' : 'none';
}

// =====================================================
//  WI-FI LOCAL (teste de rede)
// =====================================================
async function testarWifiLocal() {
  const ip    = document.getElementById('wifiIp').value.trim();
  const porta = document.getElementById('wifiPorta').value.trim() || '8080';
  const box   = document.getElementById('wifiResultado');

  if (!ip) { box.innerHTML = '<p style="color:red">Digite o IP</p>'; return; }
  box.innerHTML = '<p>⏳ Testando <code>http://' + ip + ':' + porta + '</code>...</p>';

  const url = 'http://' + ip + ':' + porta + '/';
  const t0  = performance.now();

  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    await fetch(url, { mode: 'no-cors', signal: ctrl.signal });
    clearTimeout(timer);

    const ms = Math.round(performance.now() - t0);
    box.innerHTML = `
      <p style="color:#2e7d32">✅ <strong>Porta acessível!</strong> (${ms}ms)</p>
      <p style="font-size:12px;color:#666">
        A maquininha respondeu. Se a integração automática não funcionar,
        use o modo <strong>☁️ PagSeguro Cloud</strong>.
      </p>`;
  } catch (e) {
    box.innerHTML = `
      <p style="color:#c62828">❌ Não foi possível acessar.</p>
      <p style="font-size:12px;color:#666">
        <strong>Motivo comum:</strong> a Minizinha Chip 3 <u>não expõe porta HTTP</u>
        na rede local por segurança (PCI-DSS). Ela só fala com a nuvem.<br><br>
        <strong>Solução:</strong> use o modo <strong>☁️ PagSeguro Cloud</strong>.
      </p>`;
  }
}

// =====================================================
//  PAGSEGURO CLOUD
// =====================================================
async function salvarCredenciaisPS() {
  const email    = document.getElementById('psEmail').value.trim();
  const tokenPS  = document.getElementById('psToken').value.trim();
  const ambiente = document.getElementById('psAmbiente').value;
  
  if (!email || !tokenPS) return alert('Preencha e-mail e token');

  // 🔥 VALIDAÇÃO: Impede usar o token da própria Igreja (Sheets) por engano
  const tokenIgreja = localStorage.getItem('api_token') || '';
  if (tokenPS === tokenIgreja || tokenPS.startsWith('IGREJA_')) {
    return alert(
      '❌ ERRO: Você colou o Token da sua API (IGREJA_...) no campo do PagBank!\n\n' +
      'O Token do PagBank NÃO começa com IGREJA_.\n\n' +
      'Vá em https://dev.pagbank.uol.com.br, crie uma aplicação "API de Pedidos (Orders)" ' +
      'e copie o Bearer Token gerado lá.'
    );
  }

  if (tokenPS.length < 30) {
    if (!confirm('O token parece curto (' + tokenPS.length + ' caracteres). ' +
      'Tokens do PagBank geralmente têm 80+ caracteres.\n\nContinuar mesmo assim?')) return;
  }

  localStorage.setItem('ps_email', email);
  localStorage.setItem('ps_token', tokenPS);
  localStorage.setItem('ps_ambiente', ambiente);

  const r = await API.call('salvarCredenciaisPagSeguro', {
    email: email,
    tokenPS: tokenPS,
    ambiente: ambiente
  });

  document.getElementById('cloudResultado').innerHTML = r.ok
    ? '<p style="color:#2e7d32">✅ Credenciais salvas no Sheets (ambiente: <strong>' +
      ambiente + '</strong>).<br>Agora valide o token com 🔍.</p>'
    : '<p style="color:#c62828">❌ ' + r.error + '</p>';
}

async function statusPS() {
  const box = document.getElementById('cloudResultado');
  box.innerHTML = '<p>⏳ Validando token PagBank...</p>';
  const r = await API.call('statusMaquininhaPagSeguro');
  if (!r.ok) {
    box.innerHTML = '<p style="color:#c62828">❌ ' + (r.error || 'erro') + '</p>' +
      (r.body ? '<pre style="font-size:11px;overflow:auto;background:#fff3f3;padding:8px">' +
        escapeHtml(r.body) + '</pre>' : '');
    return;
  }
  box.innerHTML = '<p style="color:#2e7d32">' + (r.mensagem || '✅ OK') + '</p>' +
    (r.body ? '<pre style="font-size:11px;overflow:auto;background:#f3fff3;padding:8px">' +
      escapeHtml(r.body) + '</pre>' : '');
}

async function testarCobrancaPS() {
  const box = document.getElementById('cloudResultado');
  if (!confirm('Criar cobrança de teste de R$ 1,00?')) return;

  box.innerHTML = '<p>⏳ Criando cobrança...</p>';
  const r = await API.call('criarCobrancaPagSeguro', {
    valor: 1.00,
    metodo: 'PIX',
    descricao: 'Teste de integração'
  });

  if (r.ok) {
    box.innerHTML = '<p style="color:#2e7d32">✅ Cobrança criada!</p>' +
      '<pre style="font-size:11px;overflow:auto;background:#f3fff3;padding:8px">' +
      escapeHtml(r.body || '') + '</pre>';

    if (r.pix && (r.pix.qrCodeText || r.pix.qrCodeImage)) {
      mostrarQrPixDireto(r.pix, 1.00);
    }
  } else {
    box.innerHTML = '<p style="color:#c62828">❌ ' + (r.error || 'erro') + '</p>' +
      (r.body ? '<pre style="font-size:11px;overflow:auto;background:#fff3f3;padding:8px">' +
        escapeHtml(r.body) + '</pre>' : '');
  }
}

// =====================================================
//  BOTÃO RÁPIDO "TESTAR MAQUININHA" (aba Vender)
// =====================================================
function testarMaquininhaRapido() {
  const modo = localStorage.getItem('modo_maquininha') || 'MANUAL';

  if (modo === 'MANUAL') {
    return alert(
      '🖐️ Modo MANUAL ativo.\n\n' +
      'Vá em "💳 Maquininha" e escolha:\n' +
      '• ☁️ PagSeguro Cloud (recomendado)\n' +
      '• 📶 Wi-Fi Local\n' +
      '• 🔵 Bluetooth\n\n' +
      'Depois volte aqui para testar.'
    );
  }

  document.querySelector('[data-tab="maquininha"]').click();
  setTimeout(() => {
    if (modo === 'CLOUD')     statusPS();
    if (modo === 'WIFI')      testarWifiLocal();
    if (modo === 'BLUETOOTH') testarConexaoBluetooth();
  }, 100);
}

// =====================================================
//  ENVIO PARA MAQUININHA (chamado na venda)
// =====================================================
async function enviarParaMaquininha(total, metodo) {
  const modo = localStorage.getItem('modo_maquininha') || 'MANUAL';

  if (modo === 'MANUAL' || modo === 'BLUETOOTH') {
    console.log('Modo ' + modo + ' — venda só será registrada.');
    return { ok: true, modo };
  }

  if (modo === 'WIFI' && !localStorage.getItem('ps_token')) {
    return { ok: false,
      error: 'Wi-Fi local puro não cobra na Minizinha Chip 3. Use PagSeguro Cloud.' };
  }

  if (modo === 'CLOUD' || (modo === 'WIFI' && localStorage.getItem('ps_token'))) {
    try {
      const r = await API.call('criarCobrancaPagSeguro', {
        valor: total, metodo, descricao: 'Venda Igreja'
      });
      if (!r.ok) {
        return {
          ok: false,
          error: r.error || 'Falha na cobrança PagBank',
          detail: r.body
        };
      }
      return r;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  return { ok: true };
}

// =====================================================
//  PIX QR CODE — exibição visual
// =====================================================
async function mostrarPixQRCode(total, descricao) {
  return new Promise(async (resolve) => {
    const box         = document.getElementById('modalPix');
    const qrContainer = document.getElementById('pixQrContainer');

    document.getElementById('pixValor').textContent = formatBRL(total);
    document.getElementById('pixCopiaCola').value   = '';
    document.getElementById('pixStatus').textContent = '⏳ Gerando cobrança PIX...';
    document.getElementById('pixStatus').style.color = '#666';
    qrContainer.innerHTML = '<p>⏳ Aguarde...</p>';
    box.classList.add('show');

    window._pixResolver = resolve;

    try {
      const r = await API.call('criarCobrancaPagSeguro', {
        valor: total,
        metodo: 'PIX',
        descricao: descricao || 'Venda Igreja'
      });

      if (!r.ok) {
        qrContainer.innerHTML =
          '<p style="color:#c62828;text-align:center">❌ ' +
          escapeHtml(r.error || 'Erro ao gerar PIX') + '</p>';
        document.getElementById('pixStatus').textContent =
          'Toque em Cancelar e escolha outro método de pagamento.';
        return;
      }

      const pix = r.pix || {};
      const qrText  = pix.qrCodeText  || '';
      const qrImage = pix.qrCodeImage || '';

      if (!qrText && !qrImage) {
        qrContainer.innerHTML =
          '<div style="font-size:11px;word-break:break-all;color:#666;text-align:center">' +
          '⚠️ Cobrança criada mas sem dados do QR Code.<br><br>' +
          'Resposta:<pre style="text-align:left;font-size:9px;max-height:200px;overflow:auto">' +
          escapeHtml((r.body || '').substring(0, 1500)) + '</pre></div>';
        document.getElementById('pixStatus').textContent =
          'Confirme o pagamento manualmente na maquininha.';
        document.getElementById('pixStatus').style.color = '#c62828';
        return;
      }

      if (qrImage) {
        qrContainer.innerHTML = '<img src="' + qrImage + '" alt="QR Code PIX" />';
      } else if (qrText) {
        const encoded = encodeURIComponent(qrText);
        qrContainer.innerHTML =
          '<img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' +
          encoded + '" alt="QR Code PIX" />';
      }

      if (qrText) {
        document.getElementById('pixCopiaCola').value = qrText;
      }

      document.getElementById('pixStatus').textContent =
        '✅ Cobrança gerada! Aguardando pagamento...';
      document.getElementById('pixStatus').style.color = '#2e7d32';

      if (pix.expirationDate) {
        const exp = new Date(pix.expirationDate);
        const intervalo = setInterval(() => {
          const diff = exp - new Date();
          if (diff <= 0) {
            clearInterval(intervalo);
            document.getElementById('pixStatus').textContent =
              '⏰ QR Code expirado. Cancele e gere novamente.';
            document.getElementById('pixStatus').style.color = '#c62828';
          }
        }, 1000);
        window._pixInterval = intervalo;
      }
    } catch (e) {
      qrContainer.innerHTML =
        '<p style="color:#c62828;text-align:center">❌ ' + escapeHtml(e.message) + '</p>';
    }
  });
}

function mostrarQrPixDireto(pix, valor) {
  const box         = document.getElementById('modalPix');
  const qrContainer = document.getElementById('pixQrContainer');

  document.getElementById('pixValor').textContent = formatBRL(valor);
  document.getElementById('pixStatus').textContent = '✅ Cobrança de teste gerada!';
  document.getElementById('pixStatus').style.color = '#2e7d32';

  if (pix.qrCodeImage) {
    qrContainer.innerHTML = '<img src="' + pix.qrCodeImage + '" alt="QR Code PIX" />';
  } else if (pix.qrCodeText) {
    qrContainer.innerHTML =
      '<img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' +
      encodeURIComponent(pix.qrCodeText) + '" alt="QR Code PIX" />';
  }

  if (pix.qrCodeText) {
    document.getElementById('pixCopiaCola').value = pix.qrCodeText;
  }

  box.classList.add('show');
  window._pixResolver = () => fecharModalPix();
}

function copiarPix() {
  const input = document.getElementById('pixCopiaCola');
  if (!input.value) return alert('Nada para copiar ainda.');
  input.select();
  input.setSelectionRange(0, 99999);
  try {
    document.execCommand('copy');
    alert('📋 Código PIX copiado!');
  } catch (e) {
    navigator.clipboard.writeText(input.value).then(
      () => alert('📋 Código PIX copiado!'),
      () => alert('Não foi possível copiar. Selecione e copie manualmente.')
    );
  }
}

function confirmarPixPago() {
  if (window._pixResolver) {
    window._pixResolver(true);
    window._pixResolver = null;
  }
  fecharModalPix();
}

function cancelarPix() {
  if (!confirm('Cancelar cobrança PIX? O QR Code será descartado.')) return;
  if (window._pixResolver) {
    window._pixResolver(false);
    window._pixResolver = null;
  }
  fecharModalPix();
}

function fecharModalPix() {
  document.getElementById('modalPix').classList.remove('show');
  if (window._pixInterval) {
    clearInterval(window._pixInterval);
    window._pixInterval = null;
  }
}

// =====================================================
//  HELPERS
// =====================================================
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
