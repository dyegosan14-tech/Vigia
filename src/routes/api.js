const express = require('express');
const crypto = require('crypto');
const pracas = require('../data/pracas.json');
const ocorrencias = require('../data/ocorrencias.json');
const { salvarOcorrencias } = require('../utils/persistencia');

const SEVERIDADES_VALIDAS = ['baixa', 'media', 'alta', 'critica'];

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

function criarRouter({ salvar = salvarOcorrencias } = {}) {
  const router = express.Router();

  router.post('/eventos', autenticarDispositivo, (req, res) => {
    const { praca_id, tipo, severidade } = req.body || {};

    if (!praca_id || !tipo || typeof praca_id !== 'string' || typeof tipo !== 'string') {
      return res.status(400).json({ erro: 'Informe praca_id e tipo do evento como textos válidos.' });
    }

    const pracaIdLimpo = praca_id.trim();
    if (!pracas.some((p) => p.id === pracaIdLimpo)) {
      return res.status(400).json({ erro: `praca_id desconhecido: ${pracaIdLimpo}` });
    }

    // Sanitiza o tipo: remove tags HTML, caracteres de controle e limita tamanho
    const tipoSanitizado = tipo
      .replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim()
      .slice(0, 120);

    if (!tipoSanitizado) {
      return res.status(400).json({ erro: 'O tipo do evento não pode ser vazio.' });
    }

    const severidadeValidada = SEVERIDADES_VALIDAS.includes(severidade) ? severidade : 'media';
    const idUnico = `sensor-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const novoEvento = {
      id: idUnico,
      praca_id: pracaIdLimpo,
      tipo: tipoSanitizado,
      severidade: severidadeValidada,
      timestamp: new Date().toISOString(),
      status: 'aberto',
      origem: 'sensor'
    };

    console.log(
      `[Evento recebido] praca=${pracaIdLimpo} tipo=${tipoSanitizado} severidade=${severidadeValidada}`
    );

    ocorrencias.unshift(novoEvento);
    salvar(ocorrencias);

    res.status(201).json({ recebido: true, id: novoEvento.id });
  });

  router.get('/status', (req, res) => {
    res.json({ status: 'ok', servico: 'Vigia - camada central', hora: new Date().toISOString() });
  });

  return router;
}

module.exports = criarRouter();
module.exports.criarRouter = criarRouter;
