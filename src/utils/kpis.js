function calcularKpis(pracas, ocorrencias) {
  const listaPracas = Array.isArray(pracas) ? pracas : [];
  const listaOcorrencias = Array.isArray(ocorrencias) ? ocorrencias : [];

  const totalEquipamentos = listaPracas.reduce((soma, p) => soma + (p.equipamentos?.total || 0), 0);
  const equipamentosOperacionais = listaPracas.reduce((soma, p) => soma + (p.equipamentos?.operacionais || 0), 0);
  const uptimePct = totalEquipamentos > 0
    ? Math.round((equipamentosOperacionais / totalEquipamentos) * 100)
    : 0;

  const ocorrenciasAbertas = listaOcorrencias.filter((o) => o && o.status !== 'resolvido').length;

  const resolvidas = listaOcorrencias.filter((o) => o && o.status === 'resolvido' && typeof o.tempo_resposta_min === 'number' && o.tempo_resposta_min > 0);
  const tempoMedioResposta = resolvidas.length > 0
    ? Math.round(resolvidas.reduce((s, o) => s + o.tempo_resposta_min, 0) / resolvidas.length)
    : null;

  const usoMedio = listaPracas.length > 0
    ? Math.round(listaPracas.reduce((s, p) => s + (Number(p.ocupacao_atual) || 0), 0) / listaPracas.length)
    : 0;

  // Soma o custo de manutencao mensal estimado de todos os equipamentos instalados
  const custoManutencaoMensal = listaPracas.reduce((soma, p) => {
    const detalhe = Array.isArray(p.equipamentos?.detalhe) ? p.equipamentos.detalhe : [];
    return soma + detalhe.reduce(
      (s, eq) => s + ((Number(eq.quantidade) || 0) * (Number(eq.custo_manutencao_unitario) || 0)),
      0
    );
  }, 0);

  const percepcaoMedia = listaPracas.length > 0
    ? (listaPracas.reduce((s, p) => s + (Number(p.percepcao_seguranca) || 0), 0) / listaPracas.length).toFixed(1)
    : '0.0';

  // Compara ocorrencias dos ultimos 7 dias com os 7 dias anteriores
  const agora = Date.now();
  const seteDias = 7 * 24 * 60 * 60 * 1000;
  const idadeMs = (o) => {
    if (!o || !o.timestamp) return -1;
    const time = new Date(o.timestamp).getTime();
    return Number.isNaN(time) ? -1 : agora - time;
  };

  const ocorrenciasRecentes = listaOcorrencias.filter((o) => {
    const idade = idadeMs(o);
    return idade >= 0 && idade <= seteDias;
  }).length;

  const ocorrenciasPeriodoAnterior = listaOcorrencias.filter((o) => {
    const idade = idadeMs(o);
    return idade > seteDias && idade <= seteDias * 2;
  }).length;

  const variacaoOcorrenciasPct = ocorrenciasPeriodoAnterior > 0
    ? Math.round(((ocorrenciasRecentes - ocorrenciasPeriodoAnterior) / ocorrenciasPeriodoAnterior) * 100)
    : null;

  return {
    uptimePct,
    ocorrenciasAbertas,
    tempoMedioResposta,
    usoMedio,
    percepcaoMedia,
    ocorrenciasRecentes,
    ocorrenciasPeriodoAnterior,
    variacaoOcorrenciasPct,
    custoManutencaoMensal
  };
}

module.exports = { calcularKpis };
