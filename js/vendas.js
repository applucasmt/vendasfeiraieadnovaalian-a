function renderListaProdutosVenda() {
  const box = document.getElementById('listaProdutosVenda');
  box.innerHTML = STATE.produtos.map(p => `
    <div class="prod-card" onclick="addCarrinho('${p.id}')">
      <img src="${p.fotoUrl || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22/>'}" alt="">
      <div class="info">
        <div class="nome">${p.nome}</div>
        <div class="setor">${p.setorNome}</div>
        <div class="preco">${formatBRL(p.preco)}</div>
      </div>
    </div>
  `).join('') || '<p>Cadastre produtos primeiro.</p>';
}

function filtrarProdutosVenda() {
  const q = document.getElementById('buscaProduto').value.toLowerCase();
  document.querySelectorAll('#listaProdutosVenda .prod-card').forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

function addCarrinho(produtoId) {
  const p = STATE.produtos.find(x => x.id === produtoId);
  if (!p) return;
  const item = STATE.carrinho.find(i => i.produtoId === produtoId);
  if (item) item.quantidade++;
  else STATE.carrinho.push({
    produtoId: p.id, produtoNome: p.nome, preco: p.preco,
    setorId: p.setorId, setorNome: p.setorNome,
    fotoUrl: p.fotoUrl, quantidade: 1
  });
  renderCarrinho();
}

function alterarQtd(produtoId, delta) {
  const item = STATE.carrinho.find(i => i.produtoId === produtoId);
  if (!item) return;
  item.quantidade += delta;
  if (item.quantidade <= 0) {
    STATE.carrinho = STATE.carrinho.filter(i => i.produtoId !== produtoId);
  }
  renderCarrinho();
}

function renderCarrinho() {
  const box = document.getElementById('carrinhoItens');
  if (!STATE.carrinho.length) {
    box.innerHTML = '<p style="color:#888">Carrinho vazio</p>';
    document.getElementById('carrinhoTotal').textContent = formatBRL(0);
    return;
  }
  box.innerHTML = STATE.carrinho.map(i => `
    <div class="item">
      <div>
        <strong>${i.produtoNome}</strong><br>
        <small>${formatBRL(i.preco)} x ${i.quantidade}</small>
      </div>
      <div class="qtd">
        <button onclick="alterarQtd('${i.produtoId}',-1)">−</button>
        ${i.quantidade}
        <button onclick="alterarQtd('${i.produtoId}',1)">+</button>
        &nbsp; ${formatBRL(i.preco * i.quantidade)}
      </div>
    </div>
  `).join('');
  const total = STATE.carrinho.reduce((t,i) => t + i.preco * i.quantidade, 0);
  document.getElementById('carrinhoTotal').textContent = formatBRL(total);
}

async function finalizarVenda() {
  if (!STATE.carrinho.length) return alert('Carrinho vazio.');
  const metodo = document.getElementById('metodoPagamento').value;

  // Se PIX/Cartão → tenta acionar Minizinha (Bluetooth)
  if (['PIX','DEBITO','CREDITO'].includes(metodo)) {
    const total = STATE.carrinho.reduce((t,i)=>t+i.preco*i.quantidade,0);
    await enviarParaMinizinha(total, metodo); // não bloqueia se falhar
  }

  const r = await API.call('registrarVenda', {
    metodoPagamento: metodo,
    itens: STATE.carrinho.map(i => ({
      produtoId: i.produtoId, produtoNome: i.produtoNome,
      preco: i.preco, quantidade: i.quantidade,
      setorId: i.setorId, setorNome: i.setorNome
    }))
  });

  if (!r.ok) return alert('Erro: ' + r.error);

  // Monta ficha para impressão (última da venda)
  STATE.lastFicha = {
    nome: STATE.carrinho.map(i => `${i.quantidade}x ${i.produtoNome}`).join(', '),
    preco: STATE.carrinho.reduce((t,i)=>t+i.preco*i.quantidade,0),
    fotoUrl: STATE.carrinho[0]?.fotoUrl || '',
    dataHora: agoraBR(),
    metodo
  };
  abrirFicha();

  STATE.carrinho = [];
  renderCarrinho();
  await sincronizar();
}

function abrirFicha() {
  const f = STATE.lastFicha;
  document.getElementById('fichaConteudo').innerHTML = `
    ${f.fotoUrl ? `<img src="${f.fotoUrl}" alt="">` : '<div style="height:260px;background:#eee"></div>'}
    <div class="nome">${f.nome}</div>
    <div class="datahora">${f.dataHora} • ${f.metodo}</div>
    <div class="rodape">
      <span>Igreja Vendas</span>
      <span class="preco">${formatBRL(f.preco)}</span>
    </div>
  `;
  document.getElementById('modalFicha').classList.add('show');
}

function fecharFicha() {
  document.getElementById('modalFicha').classList.remove('show');
}

function imprimirFicha() {
  const el = document.getElementById('fichaConteudo');
  const w = window.open('', '_blank', 'width=400,height=600');
  w.document.write(`
    <html><head><title>Ficha</title>
    <style>
      body{font-family:sans-serif;margin:0}
      .ficha{width:100%;max-width:320px;margin:20px auto;border:1px solid #ccc;border-radius:10px;overflow:hidden}
      .ficha img{width:100%;height:260px;object-fit:cover}
      .ficha .nome{padding:12px;font-size:16px;font-weight:bold}
      .ficha .datahora{padding:0 12px 12px;font-size:12px;color:#666}
      .ficha .rodape{background:#4a7c59;color:#fff;padding:12px;display:flex;justify-content:space-between}
      .ficha .preco{font-size:20px;font-weight:bold}
    </style></head><body>
    <div class="ficha">
      ${el.innerHTML}
    </div>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}<\/script>
    </body></html>
  `);
}
