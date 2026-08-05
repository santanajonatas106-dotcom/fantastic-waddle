const express = require('express');
const pool = require('../db/pool');
const config = require('../config');
const { improveSummary } = require('../services/ai');
const { streamResumePdf } = require('../services/pdf');
const { createPreference, getPayment, isApprovedForResume } = require('../services/mercadoPago');

const router = express.Router();

async function findResume(id) {
  if (id === 'rascunho') return null;
  const result = await pool.query('SELECT * FROM resumes WHERE id = $1', [id]);
  return result.rows[0] || null;
}

function ownsResume(req, id) {
  return String(req.session.resumeId || '') === String(id);
}

async function approvePaymentForResume(resumeId, paymentId) {
  const payment = await getPayment(paymentId);
  if (!isApprovedForResume(payment, resumeId)) return false;

  await pool.query(
    'UPDATE resumes SET paid = TRUE, payment_id = $1, updated_at = NOW() WHERE id = $2',
    [String(payment.id), resumeId]
  );
  return true;
}

router.get('/', (req, res) => res.render('home', { price: config.priceBrl }));
router.get('/criar', (req, res) => res.render('create', { error: null, values: {} }));

router.post('/criar', async (req, res, next) => {
  try {
    const values = {
      full_name: String(req.body.full_name || '').trim(),
      email: String(req.body.email || '').trim(),
      phone: String(req.body.phone || '').trim(),
      city: String(req.body.city || '').trim(),
      target_role: String(req.body.target_role || '').trim(),
      professional_summary: String(req.body.professional_summary || '').trim(),
      experience: String(req.body.experience || '').trim(),
      education: String(req.body.education || '').trim(),
      skills: String(req.body.skills || '').trim()
    };

    if (!values.full_name || !values.target_role) {
      return res.status(400).render('create', { error: 'Informe pelo menos seu nome e o cargo desejado.', values });
    }

    if (!values.professional_summary) {
      values.professional_summary = await improveSummary({
        targetRole: values.target_role,
        experience: values.experience,
        skills: values.skills
      });
    }

    if (!config.databaseUrl) {
      return res.status(503).send('Banco de dados não configurado. O pagamento exige que o currículo seja salvo.');
    }

    const result = await pool.query(
      `INSERT INTO resumes (full_name,email,phone,city,target_role,professional_summary,experience,education,skills)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [values.full_name, values.email, values.phone, values.city, values.target_role, values.professional_summary, values.experience, values.education, values.skills]
    );
    const id = result.rows[0].id;
    req.session.resumeId = id;
    res.redirect(`/curriculo/${id}`);
  } catch (error) {
    next(error);
  }
});

router.get('/curriculo/:id', async (req, res, next) => {
  try {
    const resume = await findResume(req.params.id);
    if (!resume || !ownsResume(req, resume.id)) return res.status(404).send('Currículo não encontrado.');

    res.render('preview', {
      resume,
      price: config.priceBrl,
      paymentEnabled: Boolean(config.mercadoPagoAccessToken),
      paymentStatus: String(req.query.pagamento || '')
    });
  } catch (error) {
    next(error);
  }
});

router.post('/curriculo/:id/pagar', async (req, res, next) => {
  try {
    const resume = await findResume(req.params.id);
    if (!resume || !ownsResume(req, resume.id)) return res.status(404).send('Currículo não encontrado.');
    if (resume.paid) return res.redirect(`/curriculo/${resume.id}?pagamento=aprovado`);

    const baseUrl = config.appUrl.replace(/\/$/, '');
    if (!baseUrl.startsWith('https://') && config.nodeEnv === 'production') {
      return res.status(500).send('APP_URL precisa usar HTTPS no Render.');
    }

    const preference = await createPreference({ resume, baseUrl });
    const isTestToken = String(config.mercadoPagoAccessToken).startsWith('TEST-');
    const checkoutUrl = isTestToken
      ? (preference.sandbox_init_point || preference.init_point)
      : (preference.init_point || preference.sandbox_init_point);

    if (!checkoutUrl) throw new Error('Mercado Pago não retornou a URL do checkout.');
    return res.redirect(303, checkoutUrl);
  } catch (error) {
    next(error);
  }
});

router.get('/pagamento/sucesso/:id', async (req, res, next) => {
  try {
    if (!ownsResume(req, req.params.id)) return res.status(404).send('Currículo não encontrado.');
    const paymentId = req.query.payment_id || req.query.collection_id;
    if (!paymentId) return res.redirect(`/curriculo/${req.params.id}?pagamento=nao-confirmado`);

    const approved = await approvePaymentForResume(req.params.id, paymentId);
    res.redirect(`/curriculo/${req.params.id}?pagamento=${approved ? 'aprovado' : 'nao-confirmado'}`);
  } catch (error) {
    next(error);
  }
});

router.get('/pagamento/pendente/:id', (req, res) => {
  if (!ownsResume(req, req.params.id)) return res.status(404).send('Currículo não encontrado.');
  res.redirect(`/curriculo/${req.params.id}?pagamento=pendente`);
});

router.get('/pagamento/falhou/:id', (req, res) => {
  if (!ownsResume(req, req.params.id)) return res.status(404).send('Currículo não encontrado.');
  res.redirect(`/curriculo/${req.params.id}?pagamento=falhou`);
});

router.post('/webhooks/mercadopago', async (req, res) => {
  res.sendStatus(200);

  try {
    const type = req.body.type || req.query.type || req.query.topic;
    const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id;
    if (!paymentId || (type && type !== 'payment')) return;

    const payment = await getPayment(paymentId);
    const resumeId = String(payment.external_reference || '');
    if (!/^\d+$/.test(resumeId) || !isApprovedForResume(payment, resumeId)) return;

    await pool.query(
      'UPDATE resumes SET paid = TRUE, payment_id = $1, updated_at = NOW() WHERE id = $2',
      [String(payment.id), resumeId]
    );
  } catch (error) {
    console.error('Falha ao processar webhook do Mercado Pago:', error.message);
  }
});

router.get('/curriculo/:id/pdf', async (req, res, next) => {
  try {
    const resume = await findResume(req.params.id);
    if (!resume || !ownsResume(req, resume.id)) return res.status(404).send('Currículo não encontrado.');
    if (!resume.paid) return res.status(402).redirect(`/curriculo/${resume.id}?pagamento=necessario`);

    streamResumePdf(res, resume);
  } catch (error) {
    next(error);
  }
});

router.get('/privacidade', (req, res) => res.render('privacy'));
router.get('/termos', (req, res) => res.render('terms'));
router.get('/blog', (req, res) => {
  res.render('blog');
});
router.get('/blog/primeiro-emprego', (req, res) => {
  res.render('artigo-primeiro-emprego');
});
router.get('/depoimentos', (req, res) => {
  res.render('depoimentos');
});
router.get('/quem-somos', (req, res) => {
  res.render('quem-somos');
});
router.get('/blog/curriculo-primeira-entrevista', (req, res) => {
  res.render('artigo-curriculo-primeira-entrevista');
});
module.exports = router;

nano src/routes/site.js
