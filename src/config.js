require('dotenv').config();

const requiredInProduction = ['SESSION_SECRET', 'DATABASE_URL', 'APP_URL', 'MERCADO_PAGO_ACCESS_TOKEN'];
if (process.env.NODE_ENV === 'production') {
  for (const key of requiredInProduction) {
    if (!process.env[key]) throw new Error(`Variável obrigatória ausente: ${key}`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  databaseUrl: process.env.DATABASE_URL || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  priceBrl: Number(process.env.PRICE_BRL || 5.9)
};
