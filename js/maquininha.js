/*******************************************************
 *  MAQUININHA - WI-FI / CLOUD / BLUETOOTH / PIX QR CODE
 *  Versão: 3.2 (Blindado contra nulos e PWA cache)
 *******************************************************/

// =====================================================
//  SELEÇÃO DE MODO
// =====================================================
function mostrarModoMaquininha() {
  const selectModo = document.getElementById('modoMaquininha');
  if (!selectModo) return;
  
  const modo = selectModo.value;
  localStorage.setItem('modo_maquininha', modo);

  const boxWifi = document.getElementById('boxWifi');
  const boxCloud = document.getElementById('boxCloud');
  const boxBluetooth = document.getElementById('boxBluetooth');

  if (boxWifi) boxWifi.style.display      = (modo === 'WIFI')      ? 'block' : 'none';
  if (boxCloud) boxCloud.style.display     = (modo === 'CLOUD')     ? 'block' : 'none';
  if (boxBluetooth) boxBluetooth.style.display = (modo === 'BLUETOOTH') ? 'block' : 'none';
}

// =====================================================
//  WI-FI LOCAL (teste de rede)
// =====================================================
async function testarWifiLocal() {
  const elIp = document.getElementById('wifiIp');
  const elPorta = document.getElementById('wifiPorta');
  const box = document.getElementById('wifiResultado');
  
  if (!elIp || !box) return;

  const ip    = elIp.value.trim();
  const porta = (elPorta ? elPorta.value.trim() : '') || '8080';

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
  const elEmail = document.getElementById('psEmail');
  const elToken = document.getElementById('psToken');
  const elAmb = document.getElementById('psAmbiente');
  const box = document.getElementById('cloudResultado');

  if (!elEmail || !elToken || !box) {
    return alert('Erro interno: Campos do formulário não encontrados. Atualize a página (Ctrl+F5).');
  }

  const email    = elEmail.value.trim();
  const tokenPS  = elToken.value.trim();
  const ambiente = elAmb ? elAmb.value : 'sandbox';
  
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

  box.innerHTML = '<p>⏳ Salvando...</p>';
  const r = await API.call('salvarCredenciaisPagSeguro', {
    email: email,
    tokenPS: tokenPS,
    ambiente: ambiente
  });

  box.innerHTML = r.ok
    ? '<p style="color:#2e7d32">✅ Credenciais salvas no Sheets (ambiente: <strong>' +
      ambiente + '</strong>).<br>Agora valide o token com 🔍.</p>'
    : '<p style="color:#c62828">❌ ' + r.error + '</p>';
}

async function statusPS() {
  const box = document.getElementById('cloudResultado');
  if (!box) return;
  
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
  if (!box) return;
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

  const abaMaq = document.querySelector('[data-tab="maquininha"]');
  if (abaMaq) abaMaq.click();
  
  setTimeout(() => {
    if (modo === 'CLOUD')     statusPS();
    if (modo === 'WIFI')      testarWifiLocal();
    if (modo === 'BLUETOOTH') { if(typeof testarConexaoBluetooth === 'function') testarConexaoBluetooth(); }
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
    const elValor     = document.getElementById('pixValor');
    const elCopiar    = document.getElementById('pixCopiaCola');
    const elStatus    = document.getElementById('pixStatus');

    if (!box || !qrContainer) {
      alert('Erro: O modal de PIX não foi encontrado no HTML. Atualize a página (Ctrl+F5).');
      return resolve(false);
    }

    if (elValor)  elValor.textContent = formatBRL(total);
    if (elCopiar) elCopiar.value = '';
    if (elStatus) {
      elStatus.textContent = '⏳ Gerando cobrança PIX...';
      elStatus.style.color = '#666';
    }
    
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
        if (elStatus) elStatus.textContent = 'Toque em Cancelar e escolha outro método de pagamento.';
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
        if (elStatus) {
          elStatus.textContent = 'Confirme o pagamento manualmente na maquininha.';
          elStatus.style.color = '#c62828';
        }
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

      if (qrText && elCopiar) {
        elCopiar.value = qrText;
      }

      if (elStatus) {
        elStatus.textContent = '✅ Cobrança gerada! Aguardando pagamento...';
        elStatus.style.color = '#2e7d32';
      }

      if (pix.expirationDate) {
        const exp = new Date(pix.expirationDate);
        const intervalo = setInterval(() => {
          const diff = exp - new Date();
          if (diff <= 0) {
            clearInterval(intervalo);
            if (elStatus) {
              elStatus.textContent = '⏰ QR Code expirado. Cancele e gere novamente.';
              elStatus.style.color = '#c62828';
            }
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
  const elValor     = document.getElementById('pixValor');
  const elCopiar    = document.getElementById('pixCopiaCola');
  const elStatus    = document.getElementById('pixStatus');

  if (!box || !qrContainer) return;

  if (elValor)  elValor.textContent = formatBRL(valor);
  if (elStatus) {
    elStatus.textContent = '✅ Cobrança de teste gerada!';
    elStatus.style.color = '#2e7d32';
  }

  if (pix.qrCodeImage) {
    qrContainer.innerHTML = '<img src="' + pix.qrCodeImage + '" alt="QR Code PIX" />';
  } else if (pix.qrCodeText) {
    qrContainer.innerHTML =
      '<img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' +
      encodeURIComponent(pix.qrCodeText) + '" alt="QR Code PIX" />';
  }

  if (pix.qrCodeText && elCopiar) {
    elCopiar.value = pix.qrCodeText;
  }

  box.classList.add('show');
  window._pixResolver = () => fecharModalPix();
}

function copiarPix() {
  const input = document.getElementById('pixCopiaCola');
  if (!input || !input.value) return alert('Nada para copiar ainda.');
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
  const modal = document.getElementById('modalPix');
  if (modal) modal.classList.remove('show');
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
