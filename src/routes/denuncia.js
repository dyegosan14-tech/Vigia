const express = require('express');
const router = express.Router();
const pracas = require('../data/pracas.json');
const ocorrencias = require('../data/ocorrencias.json');
const { salvarOcorrencias } = require('../utils/persistencia');

// Canal publico de denuncia cidada — nao exige login. Endereca a lacuna de
// "vigilancia comunitaria" apontada como tecnologia relevante para o desafio.
const SEVERIDADE_POR_TIPO = {
  'Emergencia / preciso de ajuda agora': 'critica',
  'Vandalismo em equipamento': 'alta',
  'Comportamento suspeito': 'media',
  'Iluminacao com falha': 'media',
  'Outro': 'baixa'
};

router.get('/', (req, res) => {
  res.render('denuncia', { titulo: 'Registrar denuncia', pracas, enviado: false, erro: null });
});

router.post('/', (req, res) => {
  const { praca_id, tipo, descricao } = req.body;
  const praca = pracas.find((p) => p.id === praca_id);

  // 'tipo' e restrito a esta lista fechada: alem de validar a entrada,
  // evita que um valor livre digitado via requisicao direta (fora do
  // <select> do formulario) acabe persistido e depois renderizado em
  // outras telas — o painel exibe ocorrencias sem escapar o campo em
  // alguns pontos client-side, entao a validacao precisa ocorrer aqui.
  if (!praca || !tipo || !Object.prototype.hasOwnProperty.call(SEVERIDADE_POR_TIPO, tipo)) {
    return res.status(400).render('denuncia', {
      titulo: 'Registrar denuncia',
      pracas,
      enviado: false,
      erro: 'Selecione a praca e o tipo de ocorrencia antes de enviar.'
    });
  }

  const novaOcorrencia = {
    id: `denuncia-${Date.now()}`,
    praca_id,
    tipo,
    descricao: (descricao || '').slice(0, 500),
    severidade: SEVERIDADE_POR_TIPO[tipo] || 'baixa',
    timestamp: new Date().toISOString(),
    status: 'aberto',
    origem: 'cidadao'
  };

  // Como o modulo de dados e compartilhado por referencia entre as rotas,
  // este push ja fica visivel no painel e na lista de ocorrencias. A
  // gravacao em disco garante que a denuncia sobreviva a um restart.
  ocorrencias.unshift(novaOcorrencia);
  salvarOcorrencias(ocorrencias);

  res.render('denuncia', { titulo: 'Registrar denuncia', pracas, enviado: true, erro: null });
});

module.exports = router;
