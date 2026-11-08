/**
 * Teste de conexão Bluetooth com maquininha (Minizinha Chip 3).
 * A Minizinha NÃO expõe serviço Bluetooth GATT público sem pareamento
 * via SDK da PagSeguro (app nativo). Este teste apenas confirma
 * que o navegador vê o dispositivo e consegue parear.
 * Em PWA no Chrome Android funciona; no iOS é bloqueado.
 */
async function testarConexaoBluetooth() {
  if (!navigator.bluetooth) {
    return alert(
      '❌ Web Bluetooth não disponível neste navegador.\n\n' +
      'Use Chrome no Android. No iPhone não é suportado.\n' +
      'Alternativa: finalize a venda normalmente pelo sistema.'
    );
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['battery_service']
    });

    alert('✅ Dispositivo encontrado:\n' + (device.name || '(sem nome)'));

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let lista = 'Serviços encontrados:\n';
    for (const s of services) lista += '• ' + s.uuid + '\n';
    alert(lista);

    device.gatt.disconnect();
  } catch (e) {
    alert('❌ Não foi possível conectar: ' + e.message +
      '\n\nDica: pareie a Minizinha nas Configurações do Android primeiro.');
  }
}

/**
 * Envia total para a maquininha (placeholder).
 * A integração real exige SDK da PagSeguro (PlugPag) num app nativo.
 * Aqui apenas registramos a intenção.
 */
async function enviarParaMinizinha(total, metodo) {
  console.log('🔵 Solicitando cobrança:', metodo, formatBRL(total));
  // Para integração real, seria necessário app Android + PlugPag.
  // O sistema já finaliza a venda manualmente, sem bloquear o fluxo.
}
