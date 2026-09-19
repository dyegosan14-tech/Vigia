const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

process.env.DEVICE_TOKEN = 'token-de-teste';
const { criarRouter } = require('../src/routes/api');
const ocorrencias = require('../src/data/ocorrencias.json');

function criarApp(salvar = () => {}) {
  const app = express();
  app.use(express.json());
  app.use('/api', criarRouter({ salvar }));
  return app;
}

async function comServidor(app, executar) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    await executar(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('API: /api/status deve responder com status ok', async () => {
  await comServidor(criarApp(), async (port) => {
    const res = await fetch(`http://localhost:${port}/api/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.servico, 'Vigia - camada central');
  });
});

test('API: POST /api/eventos exige token e rejeita praça desconhecida', async () => {
  await comServidor(criarApp(), async (port) => {
    const semToken = await fetch(`http://localhost:${port}/api/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ praca_id: 'praca-republica', tipo: 'Alerta' })
    });
    assert.equal(semToken.status, 401);

    const res = await fetch(`http://localhost:${port}/api/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-de-teste' },
      body: JSON.stringify({ praca_id: 'praca-inexistente', tipo: 'Alerta' })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.erro, /praca_id desconhecido/);
  });
});

test('API: POST /api/eventos sanitiza conteúdo e não grava em disco no teste', async () => {
  let quantidadeDeGravacoes = 0;

  await comServidor(criarApp(() => { quantidadeDeGravacoes += 1; }), async (port) => {
    const res = await fetch(`http://localhost:${port}/api/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-de-teste' },
      body: JSON.stringify({
        praca_id: 'praca-republica',
        tipo: '<script>alert("xss")</script>Sensor teste'
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.recebido, true);
    assert.match(body.id, /^sensor-\d+-[a-f0-9]+$/);
    assert.equal(quantidadeDeGravacoes, 1);

    const idx = ocorrencias.findIndex((o) => o.id === body.id);
    assert.notEqual(idx, -1);
    assert.equal(ocorrencias[idx].tipo, 'alert("xss")Sensor teste');
    ocorrencias.splice(idx, 1);
  });
});
