const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularKpis } = require('../src/utils/kpis');

test('calcularKpis: deve calcular corretamente com dados padrão', () => {
  const pracas = [
    {
      id: 'p1',
      ocupacao_atual: 50,
      percepcao_seguranca: 8.0,
      equipamentos: {
        total: 10,
        operacionais: 8,
        detalhe: [
          { quantidade: 5, custo_manutencao_unitario: 100 },
          { quantidade: 5, custo_manutencao_unitario: 50 }
        ]
      }
    },
    {
      id: 'p2',
      ocupacao_atual: 70,
      percepcao_seguranca: 6.0,
      equipamentos: {
        total: 10,
        operacionais: 10,
        detalhe: [
          { quantidade: 10, custo_manutencao_unitario: 20 }
        ]
      }
    }
  ];

  const ocorrencias = [
    { status: 'aberto', timestamp: new Date().toISOString() },
    { status: 'resolvido', tempo_resposta_min: 10, timestamp: new Date().toISOString() },
    { status: 'resolvido', tempo_resposta_min: 20, timestamp: new Date().toISOString() }
  ];

  const kpis = calcularKpis(pracas, ocorrencias);

  assert.equal(kpis.uptimePct, 90); // 18 / 20 = 90%
  assert.equal(kpis.ocorrenciasAbertas, 1);
  assert.equal(kpis.tempoMedioResposta, 15); // (10 + 20) / 2
  assert.equal(kpis.usoMedio, 60); // (50 + 70) / 2
  assert.equal(kpis.percepcaoMedia, '7.0'); // (8.0 + 6.0) / 2
  assert.equal(kpis.custoManutencaoMensal, 950); // (500 + 250) + 200
  assert.equal(typeof kpis.variacaoOcorrenciasPct === 'number' || kpis.variacaoOcorrenciasPct === null, true);
});

test('calcularKpis: deve lidar com listas vazias sem gerar NaN', () => {
  const kpis = calcularKpis([], []);

  assert.equal(kpis.uptimePct, 0);
  assert.equal(kpis.ocorrenciasAbertas, 0);
  assert.equal(kpis.tempoMedioResposta, null);
  assert.equal(kpis.usoMedio, 0);
  assert.equal(kpis.percepcaoMedia, '0.0');
  assert.equal(kpis.custoManutencaoMensal, 0);
  assert.equal(kpis.variacaoOcorrenciasPct, null);
  assert.equal(Number.isNaN(kpis.usoMedio), false);
  assert.equal(Number.isNaN(Number(kpis.percepcaoMedia)), false);
});

test('calcularKpis: deve resistir a praças com equipamentos nulos ou ausentes', () => {
  const pracas = [
    { id: 'p1', ocupacao_atual: 40, percepcao_seguranca: 7 },
    { id: 'p2', ocupacao_atual: 60, percepcao_seguranca: 5, equipamentos: {} }
  ];

  const kpis = calcularKpis(pracas, []);

  assert.equal(kpis.uptimePct, 0);
  assert.equal(kpis.usoMedio, 50);
  assert.equal(kpis.percepcaoMedia, '6.0');
  assert.equal(kpis.custoManutencaoMensal, 0);
});

test('calcularKpis: deve ignorar timestamps inválidos sem quebrar o cálculo', () => {
  const ocorrencias = [
    { status: 'aberto', timestamp: 'data-invalida' },
    { status: 'resolvido', timestamp: null },
    { status: 'aberto' }
  ];

  const kpis = calcularKpis([], ocorrencias);
  assert.equal(kpis.ocorrenciasAbertas, 2);
  assert.equal(kpis.ocorrenciasRecentes, 0);
});
