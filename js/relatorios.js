async function gerarRelatorio() {
  const box = document.getElementById('relatorioConteudo');
  box.innerHTML = '<p>Gerando...</p>';
  const r = await API.call('relatorio');
  if (!r.ok) return box.innerHTML = '<p style="color:red">' + r.error + '</p>';

  let html = '<div class="relatorio">';
  r.relatorio.forEach(bloco => {
    html += `<h3>📁 ${bloco.setor}</h3>`;
    html += '<table><thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th><th>Data</th></tr></thead><tbody>';
    bloco.itens.forEach(i => {
      html += `<tr>
        <td>${i.produtoNome}</td>
        <td>${i.quantidade}</td>
        <td>${formatBRL(i.precoUnitario)}</td>
        <td>${formatBRL(i.total)}</td>
        <td>${String(i.dataHora).substring(0,10)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    html += `<div class="total-setor">Total do setor: ${formatBRL(bloco.total)}</div>`;
  });
  if (!r.relatorio.length) html += '<p>Nenhuma venda registrada.</p>';
  html += '</div>';
  box.innerHTML = html;
}
