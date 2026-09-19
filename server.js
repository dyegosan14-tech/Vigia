require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// Evita expor a tecnologia usada pelo servidor em todas as respostas.
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'vigia-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.use((req, res, next) => {
  res.locals.usuario = req.session ? req.session.usuario || null : null;
  res.locals.rotaAtual = req.path;
  next();
});

const requireAuth = require('./src/middleware/auth');

app.use('/', require('./src/routes/auth'));
app.use('/api', require('./src/routes/api'));
app.use('/denuncia', require('./src/routes/denuncia'));
app.use('/', requireAuth, require('./src/routes/index'));
app.use('/pracas', requireAuth, require('./src/routes/pracas'));
app.use('/ocorrencias', requireAuth, require('./src/routes/ocorrencias'));

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', { titulo: 'Página não encontrada' });
});

// Middleware Global de Tratamento de Erros (500)
app.use((err, req, res, next) => {
  console.error('[Vigia] Erro interno:', err.stack || err.message || err);
  if (res.headersSent) return next(err);
  res.status(500).render('404', { titulo: 'Erro interno no servidor' });
});

if (require.main === module) {
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET deve ser configurado em produção.');
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Vigia rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
