require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'vigia-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
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

app.use((req, res) => {
  res.status(404).render('404', { titulo: 'Pagina nao encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Vigia rodando em http://localhost:${PORT}`);
});
