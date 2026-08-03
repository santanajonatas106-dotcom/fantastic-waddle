const config = require('../config');

const API_BASE = 'https://api.mercadopago.com';

function assertConfigured() {
  if (!config.mercadoPagoAccessToken) {
    const error = new Error('Mercado Pago não configurado.');
    error.statusCode = 503;
    throw error;
  }
}

async function mpRequest(path, options = {}) {
  assertConfigured();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.mercadoPagoAccessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || `Erro do Mercado Pago (${response.status}).`);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

async function createPreference({ resume, baseUrl }) {
  return mpRequest('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          id: `curriculo-${resume.id}`,
          title: 'Currículo profissional em PDF',
          description: `Currículo de ${resume.full_name}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(config.priceBrl)
        }
      ],
      payer: resume.email ? { email: resume.email } : undefined,
      external_reference: String(resume.id),
      back_urls: {
        success: `${baseUrl}/pagamento/sucesso/${resume.id}`,
        pending: `${baseUrl}/pagamento/pendente/${resume.id}`,
        failure: `${baseUrl}/pagamento/falhou/${resume.id}`
      },
      notification_url: `${baseUrl}/webhooks/mercadopago`,
      auto_return: 'approved',
      statement_descriptor: 'CURRICULOFACIL'
    })
  });
}

async function getPayment(paymentId) {
  if (!/^\d+$/.test(String(paymentId || ''))) {
    const error = new Error('Identificador de pagamento inválido.');
    error.statusCode = 400;
    throw error;
  }
  return mpRequest(`/v1/payments/${paymentId}`, { method: 'GET' });
}

function isApprovedForResume(payment, resumeId) {
  const amountMatches = Math.abs(Number(payment.transaction_amount) - Number(config.priceBrl)) < 0.001;
  return payment.status === 'approved'
    && String(payment.external_reference || '') === String(resumeId)
    && payment.currency_id === 'BRL'
    && amountMatches;
}

module.exports = { createPreference, getPayment, isApprovedForResume };
