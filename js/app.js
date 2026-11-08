// ---------- Estado global ----------
const STATE = {
  setores: [],
  produtos: [],
  carrinho: [],
  lastFicha: null
};

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', () => {
  const url   = localStorage.getItem('api_url');
  const token = localStorage.getItem('api_token');
  if (url && token) {
    entrarApp();
  } else {
    mostrarTela('setupScreen');
    // pré-preencher se já existir
    document.getElementById('cfgUrl').value   = url   || '';
    document.getElementById('cfgToken').value = token || '';
  }
});

function mostrarTela(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function salvarConfig() {
  const u = document.getElementById('cfgUrl').value.trim();
  const t = document.getElementById('cfgToken').value.trim();
  if (!u || !t) return alert('Preencha URL e Token');
  localStorage.setItem('api_url', u);
  localStorage.setItem('api_token', t);
  entrarApp();
}

function atualizarConfig() {
  const u = document.getElementById('cfgUrl2').value.trim();
  const t = document.getElementById('cfgToken2').value.trim();
  localStorage.setItem('api_url', u);
  localStorage.setItem('api_token', t);
  alert('Configurações salvas');
  sincronizar();
}

function logout() {
  if (!confirm('Sair e apagar configurações?')) return;
  localStorage.clear();
  location.reload();
}

async function entrarApp() {
  mostrarTela('appScreen');
  document.getElementById('cfgUrl2').value   = API.getUrl();
  document.getElementById('cfgToken2').value = API.getToken();
  configurarTabs();
  await sincronizar();
}

function configurarTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'dashboard')  carregarDashboard();
      if (btn.dataset.tab === 'relatorios') /* lazy */;
    };
  });
}

async function sincronizar() {
  try {
    const [rSet, rProd] = await Promise.all([
      API.call('listarSetores'),
      API.call('listarProdutos')
    ]);
    STATE.setores  = rSet.setores   || [];
    STATE.produtos = (rProd.produtos || []).filter(p => p.ativo === 'SIM');

    preencherSelectSetores();
    renderListaProdutosVenda();
    renderListaProdutosAdmin();
    carregarDashboard();
  } catch (e) {
    alert('Erro ao sincronizar: ' + e.message);
  }
}

function preencherSelectSetores() {
  const sel = document.getElementById('prodSetor');
  sel.innerHTML = '<option value="">-- Escolha --</option>' +
    STATE.setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
}

function formatBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function agoraBR() {
  return new Date().toLocaleString('pt-BR');
}
