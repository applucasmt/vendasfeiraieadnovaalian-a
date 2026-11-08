let charts = { setor:null, metodo:null, produto:null };

async function carregarDashboard() {
  try {
    const r = await API.call('dashboard');
    if (!r.ok) throw new Error(r.error);

    document.getElementById('kpis').innerHTML = `
      <div class="kpi"><div class="label">Total Geral</div><div class="valor">${formatBRL(r.totalGeral)}</div></div>
      <div class="kpi"><div class="label">Hoje</div><div class="valor">${formatBRL(r.totalHoje)}</div></div>
      <div class="kpi"><div class="label">Este mês</div><div class="valor">${formatBRL(r.totalMes)}</div></div>
      <div class="kpi"><div class="label">Itens vendidos</div><div class="valor">${r.qtdItens}</div></div>
    `;

    desenharPie('chartSetor', 'setor',  r.porSetor,  charts);
    desenharPie('chartMetodo','metodo', r.porMetodo, charts);
    desenharBar('chartProduto','produto', r.porProduto, charts);
  } catch (e) { console.error(e); }
}

function desenharPie(canvasId, key, obj, store) {
  const labels = Object.keys(obj);
  const dados  = labels.map(l => obj[l]);
  if (store[key]) store[key].destroy();
  const ctx = document.getElementById(canvasId);
  store[key] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: dados, backgroundColor: palette(labels.length) }] },
    options: { responsive:true, plugins:{ legend:{ position:'bottom' } } }
  });
}

function desenharBar(canvasId, key, obj, store) {
  const entries = Object.entries(obj).sort((a,b) => b[1]-a[1]).slice(0,10);
  const labels = entries.map(e => e[0]);
  const dados  = entries.map(e => e[1]);
  if (store[key]) store[key].destroy();
  const ctx = document.getElementById(canvasId);
  store[key] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label:'R$', data: dados, backgroundColor:'#4a7c59' }] },
    options: { responsive:true, plugins:{ legend:{ display:false } } }
  });
}

function palette(n) {
  const base = ['#4a7c59','#7cb08a','#a8d5b0','#cfe9d3','#e3f4e6',
                '#d9a441','#e8bf6a','#b06a2f','#8a4b1c','#3d5a80'];
  const out = [];
  for (let i=0;i<n;i++) out.push(base[i % base.length]);
  return out;
}
