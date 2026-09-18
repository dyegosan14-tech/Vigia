const express = require('express');
const router = express.Router();
const ocorrencias = require('../data/ocorrencias.json');
const pracas = require('../data/pracas.json');

router.get('/', (req, res) => {
  const { severidade, status, praca_id } = req.query;
  let lista = [...ocorrencias];

  if (severidade) lista = lista.filter((o) => o.severidade === severidade);
  if (status) lista = lista.filter((o) => o.status === status);
  if (praca_id) lista = lista.filter((o) => o.praca_id === praca_id);

  lista.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.render('ocorrencias', {
    titulo: 'Ocorrencias',
    ocorrencias: lista,
    pracas,
    filtros: { severidade: severidade || '', status: status || '', praca_id: praca_id || '' }
  });
});

module.exports = router;
