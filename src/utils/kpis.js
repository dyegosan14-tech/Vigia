function calcularKpis(pracas, ocorrencias) {
  const totalEquipamentos = pracas.reduce((soma, p) => soma + p.equipamentos.total, 0);
  const equipamentosOperacionais = pracas.reduce((soma, p) => soma + p.equipamentos.operacionais, 0);
  const uptimePct = totalEquipamentos
    ? Math.round((equipamentosOperacionais / totalEquipamentos) * 100)
    : 0;

  const ocorrenciasAbertas = ocorrencias.filter((o) => o.status !== 'resolvido').length;

  const resolvidas = ocorrencias.filter((o) => o.status === 'resolvido' && o.tempo_resposta_min);
  const tempoMedioResposta = resolvidas.length
    ? Math.round(resolvidas.reduce((s, o) => s + o.tempo_resposta_min, 0) / resolvidas.length)
    : null;

  const usoMedio = Math.round(pracas.reduce((s, p) => s + p.ocupacao_atual, 0) / pracas.length);

  // Soma o custo de manutencao mensal estimado de todos os equipamentos
  // instalados — cobre o risco "custos de manutencao" listado no desafio.
  const custoManutencaoMensal = pracas.reduce(
    (soma, p) => soma + p.equipamentos.detalhe.reduce(
      (s, eq) => s + eq.quantidade * (eq.custo_manutencao_unitario || 0),
      0
    ),
    0
  );

  const percepcaoMedia = (
    pracas.reduce((s, p) => s + p.percepcao_seguranca, 0) / pracas.length
  ).toFixed(1);

  // Compara ocorrencias dos ultimos 7 dias com os 7 dias anteriores, como
  // proxy simples do indicador "reducao da criminalidade" pedido no desafio.
  const agora = Date.now();
  const seteDias = 7 * 24 * 60 * 60 * 1000;
  const idadeMs = (o) => agora - new Date(o.timestamp).getTime();
  const ocorrenciasRecentes = ocorrencias.filter((o) => idadeMs(o) >= 0 && idadeMs(o) <= seteDias).length;
  const ocorrenciasPeriodoAnterior = ocorrencias.filter(
    (o) => idadeMs(o) > seteDias && idadeMs(o) <= seteDias * 2
  ).length;
  const variacaoOcorrenciasPct = ocorrenciasPeriodoAnterior
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
