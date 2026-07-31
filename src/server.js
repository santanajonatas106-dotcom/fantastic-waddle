const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const config = require('./config');
const siteRoutes = require('./routes/site');

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  name: 'curriculofacil.sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 1000 * 60 * 60 * 2
  }
}));

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.use(siteRoutes);
app.use((_req, res) => res.status(404).send('Página não encontrada.'));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).send('Ocorreu um erro. Tente novamente.');
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`CurriculoFacil IA rodando na porta ${config.port}`);
});
