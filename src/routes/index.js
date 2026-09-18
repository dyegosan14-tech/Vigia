const express = require('express');
const router = express.Router();
const pracas = require('../data/pracas.json');
const ocorrencias = require('../data/ocorrencias.json');
const tendencia = require('../data/tendencia.json');
const { calcularKpis } = require('../utils/kpis');

router.get('/', (req, res) => {
  const kpis = calcularKpis(pracas, ocorrencias);
  const ultimasOcorrencias = [...ocorrencias]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6);

  res.render('dashboard', {
    titulo: 'Painel geral',
    pracas,
    kpis,
    ultimasOcorrencias,
    tendencia
  });
});

// Consumido pelo painel via polling (public/js/dashboard.js) para simular
// atualizacao quase em tempo real sem exigir infraestrutura de WebSocket.
router.get('/resumo', (req, res) => {
  const kpis = calcularKpis(pracas, ocorrencias);
  const ultimasOcorrencias = [...ocorrencias]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6)
    .map((o) => {
      const praca = pracas.find((p) => p.id === o.praca_id);
      return {
        tipo: o.tipo,
        severidade: o.severidade,
        status: o.status,
        origem: o.origem,
        hora: new Date(o.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
        pracaNome: praca ? praca.nome : o.praca_id
      };
    });

  res.json({ kpis, ultimasOcorrencias });
});

module.exports = router;
