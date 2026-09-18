const express = require('express');
const router = express.Router();

const USUARIO_DEMO = process.env.DEMO_USER || 'operador';
const SENHA_DEMO = process.env.DEMO_PASS || 'vigia2026';

router.get('/login', (req, res) => {
  if (req.session && req.session.usuario) return res.redirect('/');
  res.render('login', { titulo: 'Entrar', erro: null });
});

router.post('/login', (req, res) => {
  const { usuario, senha } = req.body || {};
  if (
    typeof usuario === 'string' &&
    typeof senha === 'string' &&
    usuario.trim() === USUARIO_DEMO &&
    senha === SENHA_DEMO
  ) {
    req.session.usuario = usuario.trim();
    return res.redirect('/');
  }
  res.render('login', { titulo: 'Entrar', erro: 'Usuário ou senha incorretos.' });
});

router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  } else {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  }
});

module.exports = router;
