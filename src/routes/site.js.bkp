const express = require('express');
const pool = require('../db/pool');
const config = require('../config');
const { improveSummary } = require('../services/ai');
const { streamResumePdf } = require('../services/pdf');

const router = express.Router();

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

    let id;
    if (config.databaseUrl) {
      const result = await pool.query(
        `INSERT INTO resumes (full_name,email,phone,city,target_role,professional_summary,experience,education,skills)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [values.full_name, values.email, values.phone, values.city, values.target_role, values.professional_summary, values.experience, values.education, values.skills]
      );
      id = result.rows[0].id;
      req.session.resumeId = id;
    } else {
      req.session.resumeDraft = values;
      id = 'rascunho';
    }

    res.redirect(`/curriculo/${id}`);
  } catch (error) {
    next(error);
  }
});

router.get('/curriculo/:id', async (req, res, next) => {
  try {
    let resume;
    if (req.params.id === 'rascunho') resume = req.session.resumeDraft;
    else {
      const result = await pool.query('SELECT * FROM resumes WHERE id = $1', [req.params.id]);
      resume = result.rows[0];
    }
    if (!resume) return res.status(404).send('Currículo não encontrado.');
    res.render('preview', { resume, price: config.priceBrl, paymentEnabled: Boolean(config.mercadoPagoAccessToken) });
  } catch (error) {
    next(error);
  }
});

router.get('/curriculo/:id/pdf', async (req, res, next) => {
  try {
    let resume;
    if (req.params.id === 'rascunho') resume = req.session.resumeDraft;
    else {
      const result = await pool.query('SELECT * FROM resumes WHERE id = $1', [req.params.id]);
      resume = result.rows[0];
    }
    if (!resume) return res.status(404).send('Currículo não encontrado.');

    // Durante a preparação o PDF fica liberado para teste.
    // Na produção, trocaremos por: if (!resume.paid) return res.redirect(`/pagamento/${resume.id}`)
    streamResumePdf(res, resume);
  } catch (error) {
    next(error);
  }
});

router.get('/privacidade', (req, res) => res.render('privacy'));
router.get('/termos', (req, res) => res.render('terms'));

module.exports = router;
