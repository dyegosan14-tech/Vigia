const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pracas = require('../data/pracas.json');
const ocorrencias = require('../data/ocorrencias.json');
const { salvarOcorrencias } = require('../utils/persistencia');

const SEVERIDADES_VALIDAS = ['baixa', 'media', 'alta', 'critica'];

// Ponto de integracao para os sensores e cameras reais (camada de borda).
// Nesta demo, um unico DEVICE_TOKEN compartilhado protege o endpoint; em
// producao, use um token individual por dispositivo para poder revogar
// e auditar por sensor.
function autenticarDispositivo(req, res, next) {
  const tokenEsperado = process.env.DEVICE_TOKEN;
  if (!tokenEsperado) {
    console.warn('[Vigia] DEVICE_TOKEN nao configurado — POST /api/eventos esta aberto sem autenticacao.');
    return next();
  }

  const cabecalho = req.get('authorization') || '';
  const tokenRecebido = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';

  const bufEsperado = Buffer.from(tokenEsperado);
  const bufRecebido = Buffer.from(tokenRecebido);
  const valido = bufEsperado.length === bufRecebido.length
    && crypto.timingSafeEqual(bufEsperado, bufRecebido);

  if (!valido) {
    return res.status(401).json({ erro: 'Token de dispositivo invalido ou ausente.' });
  }

  next();
}

router.post('/eventos', autenticarDispositivo, (req, res) => {
  const { praca_id, tipo, severidade } = req.body;

  if (!praca_id || !tipo) {
    return res.status(400).json({ erro: 'Informe praca_id e tipo do evento.' });
  }

  if (!pracas.some((p) => p.id === praca_id)) {
    return res.status(400).json({ erro: `praca_id desconhecido: ${praca_id}` });
  }

  const severidadeValidada = SEVERIDADES_VALIDAS.includes(severidade) ? severidade : 'media';

  const novoEvento = {
    id: `sensor-${Date.now()}`,
    praca_id,
    tipo,
    severidade: severidadeValidada,
    timestamp: new Date().toISOString(),
    status: 'aberto',
    origem: 'sensor'
  };

  console.log(
    `[Evento recebido] praca=${praca_id} tipo=${tipo} severidade=${severidadeValidada}`
  );

  // O array e compartilhado por referencia com as demais rotas (mesmo
  // padrao usado em src/routes/denuncia.js): o evento ja fica visivel no
  // painel e na lista de ocorrencias, e a gravacao em disco garante que
  // sobreviva a um restart do servidor.
  ocorrencias.unshift(novoEvento);
  salvarOcorrencias(ocorrencias);

  res.status(201).json({ recebido: true, id: novoEvento.id });
});

router.get('/status', (req, res) => {
  res.json({ status: 'ok', servico: 'Vigia - camada central', hora: new Date().toISOString() });
});

module.exports = router;
