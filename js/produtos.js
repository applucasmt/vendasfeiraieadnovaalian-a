let fotoBase64 = null;

function previewFoto(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    fotoBase64 = e.target.result;
    document.getElementById('previewFoto').src = fotoBase64;
  };
  reader.readAsDataURL(f);
}

async function salvarProduto(ev) {
  ev.preventDefault();
  const id      = document.getElementById('prodId').value;
  const nome    = document.getElementById('prodNome').value.trim();
  const desc    = document.getElementById('prodDesc').value.trim();
  const preco   = Number(document.getElementById('prodPreco').value);
  const setorId = document.getElementById('prodSetor').value;
  const estoque = Number(document.getElementById('prodEstoque').value || 0);
  const setor   = STATE.setores.find(s => s.id === setorId);
  if (!nome || !preco || !setor) return alert('Preencha todos os campos obrigatórios');

  let fotoUrl = '';
  if (fotoBase64) {
    const r = await API.call('uploadFoto', {
      base64: fotoBase64,
      mimeType: 'image/jpeg',
      nomeArquivo: 'produto_' + Date.now() + '.jpg'
    });
    if (r.ok) fotoUrl = r.url;
    else return alert('Erro no upload da foto: ' + r.error);
  }

  const payload = {
    id, nome, descricao: desc, preco,
    setorId: setor.id, setorNome: setor.nome,
    estoque, fotoUrl, ativo: 'SIM'
  };

  const r = await API.call(id ? 'editarProduto' : 'cadastrarProduto', payload);
  if (!r.ok) return alert('Erro: ' + r.error);

  fotoBase64 = null;
  document.getElementById('formProduto').reset();
  document.getElementById('previewFoto').src = '';
  document.getElementById('prodId').value = '';
  await sincronizar();
  alert('✅ Produto salvo!');
}

function renderListaProdutosAdmin() {
  const box = document.getElementById('listaProdutosAdmin');
  box.innerHTML = STATE.produtos.map(p => `
    <div class="prod-card">
      <img src="${p.fotoUrl || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22/>'}" alt="">
      <div class="info">
        <div class="nome">${p.nome}</div>
        <div class="setor">${p.setorNome}</div>
        <div class="preco">${formatBRL(p.preco)}</div>
        <button class="btn" style="padding:4px 8px;font-size:12px;margin-top:6px"
          onclick="editarProduto('${p.id}')">✏️</button>
        <button class="btn danger" style="padding:4px 8px;font-size:12px;margin-top:6px"
          onclick="excluirProduto('${p.id}')">🗑️</button>
      </div>
    </div>
  `).join('') || '<p>Nenhum produto cadastrado.</p>';
}

function editarProduto(id) {
  const p = STATE.produtos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('prodId').value      = p.id;
  document.getElementById('prodNome').value    = p.nome;
  document.getElementById('prodDesc').value    = p.descricao || '';
  document.getElementById('prodPreco').value   = p.preco;
  document.getElementById('prodSetor').value   = p.setorId;
  document.getElementById('prodEstoque').value = p.estoque;
  document.getElementById('previewFoto').src   = p.fotoUrl || '';
  document.querySelector('[data-tab="produtos"]').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirProduto(id) {
  if (!confirm('Desativar este produto?')) return;
  const r = await API.call('excluirProduto', { id });
  if (!r.ok) return alert(r.error);
  await sincronizar();
}
