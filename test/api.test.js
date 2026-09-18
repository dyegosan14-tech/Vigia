const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const persistencia = require('../src/utils/persistencia');
// Desativa escrita em disco durante os testes automatizados
persistencia.salvarOcorrencias = () => {};

test('API: /api/status deve responder com status ok', async () => {
  const app = express();
  app.use('/api', require('../src/routes/api'));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.servico, 'Vigia - camada central');
  } finally {
    server.close();
  }
});

test('API: POST /api/eventos deve rejeitar praca desconhecida', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', require('../src/routes/api'));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ praca_id: 'praca-inexistente', tipo: 'Alerta' })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.erro, /praca_id desconhecido/);
  } finally {
    server.close();
  }
});

test('API: POST /api/eventos deve sanitizar tags HTML no tipo', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', require('../src/routes/api'));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        praca_id: 'praca-republica',
        tipo: '<script>alert("xss")</script>Sensor teste'
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.recebido, true);
    assert.match(body.id, /^sensor-\d+-[a-f0-9]+$/);

    // Limpa dados de teste para não contaminar o banco JSON
    const ocorrencias = require('../src/data/ocorrencias.json');
    const idx = ocorrencias.findIndex(o => o.id === body.id);
    if (idx !== -1) {
      ocorrencias.splice(idx, 1);
      const { salvarOcorrencias } = require('../src/utils/persistencia');
      salvarOcorrencias(ocorrencias);
    }
  } finally {
    server.close();
  }
});
