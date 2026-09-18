const express = require('express');
const router = express.Router();
const pracas = require('../data/pracas.json');
const ocorrencias = require('../data/ocorrencias.json');

router.get('/', (req, res) => {
  res.render('pracas', { titulo: 'Pracas monitoradas', pracas });
});

router.get('/:id', (req, res) => {
  const praca = pracas.find((p) => p.id === req.params.id);
  if (!praca) return res.status(404).render('404', { titulo: 'Praca nao encontrada' });

  const eventos = ocorrencias
    .filter((o) => o.praca_id === praca.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.render('praca-detalhe', { titulo: praca.nome, praca, eventos });
});

module.exports = router;
