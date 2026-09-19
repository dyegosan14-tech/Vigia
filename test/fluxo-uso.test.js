const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'segredo-de-teste';
process.env.DEMO_USER = 'operador-teste';
process.env.DEMO_PASS = 'senha-teste';
const app = require('../server');

async function comServidor(executar) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;

  try {
    await executar(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('fluxo de uso: cidadão acessa o canal público e operador entra no painel', async () => {
  await comServidor(async (baseUrl) => {
    const denuncia = await fetch(`${baseUrl}/denuncia`);
    assert.equal(denuncia.status, 200);
    assert.match(await denuncia.text(), /Canal 100% Anônimo e Gratuito/);

    const protegido = await fetch(`${baseUrl}/`, { redirect: 'manual' });
    assert.equal(protegido.status, 302);
    assert.equal(protegido.headers.get('location'), '/login');

    const login = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ usuario: 'operador-teste', senha: 'senha-teste' })
    });
    assert.equal(login.status, 302);
    assert.equal(login.headers.get('location'), '/');

    const cookie = login.headers.get('set-cookie');
    assert.ok(cookie, 'o login deve criar uma sessão');

    const painel = await fetch(`${baseUrl}/`, { headers: { Cookie: cookie } });
    assert.equal(painel.status, 200);
    assert.match(await painel.text(), /Chamados em Aberto/);
  });
});

test('qualidade HTTP: respostas incluem cabeçalhos de proteção', async () => {
  await comServidor(async (baseUrl) => {
    const resposta = await fetch(`${baseUrl}/api/status`);
    assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(resposta.headers.get('x-frame-options'), 'DENY');
    assert.equal(resposta.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });
});
