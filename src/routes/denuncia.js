const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pracas = require('../data/pracas.json');
const ocorrencias = require('../data/ocorrencias.json');
const { salvarOcorrencias } = require('../utils/persistencia');

const SEVERIDADE_POR_TIPO = {
  'Emergencia / preciso de ajuda agora': 'critica',
  'Vandalismo em equipamento': 'alta',
  'Comportamento suspeito': 'media',
  'Iluminacao com falha': 'media',
  'Outro': 'baixa'
};

router.get('/', (req, res) => {
  res.render('denuncia', {
    titulo: 'Registrar denúncia',
    pracas,
    enviado: false,
    erro: null,
    dados: {}
  });
});

router.post('/', (req, res) => {
  const { praca_id, tipo, descricao } = req.body || {};

  const pracaIdLimpo = typeof praca_id === 'string' ? praca_id.trim() : '';
  const tipoLimpo = typeof tipo === 'string' ? tipo.trim() : '';
  const praca = pracas.find((p) => p.id === pracaIdLimpo);

  if (!praca || !tipoLimpo || !Object.prototype.hasOwnProperty.call(SEVERIDADE_POR_TIPO, tipoLimpo)) {
    return res.status(400).render('denuncia', {
      titulo: 'Registrar denúncia',
      pracas,
      enviado: false,
      erro: 'Selecione a praça e o tipo de ocorrência antes de enviar.',
      dados: {
        praca_id: pracaIdLimpo,
        tipo: tipoLimpo,
        descricao: typeof descricao === 'string' ? descricao : ''
      }
    });
  }

  const descricaoSanitizada = typeof descricao === 'string'
    ? descricao.replace(/<[^>]*>/g, '').trim().slice(0, 500)
    : '';

  const idUnico = `denuncia-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const novaOcorrencia = {
    id: idUnico,
    praca_id: pracaIdLimpo,
    tipo: tipoLimpo,
    descricao: descricaoSanitizada,
    severidade: SEVERIDADE_POR_TIPO[tipoLimpo] || 'baixa',
    timestamp: new Date().toISOString(),
    status: 'aberto',
    origem: 'cidadao'
  };

  ocorrencias.unshift(novaOcorrencia);
  salvarOcorrencias(ocorrencias);

  res.render('denuncia', {
    titulo: 'Registrar denúncia',
    pracas,
    enviado: true,
    erro: null,
    dados: {}
  });
});

module.exports = router;
