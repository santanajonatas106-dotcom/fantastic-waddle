const OpenAI = require('openai');
const config = require('../config');

async function improveSummary({ targetRole, experience, skills }) {
  if (!config.openaiApiKey) {
    return `Profissional com experiência em ${targetRole || 'sua área de atuação'}, comprometido com resultados, organização e aprendizado contínuo. Possui conhecimentos em ${skills || 'competências relevantes para a função'} e busca contribuir de forma responsável para os objetivos da empresa.`;
  }

  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: 'Você escreve resumos profissionais de currículo em português do Brasil. Produza somente um parágrafo objetivo, verdadeiro, sem inventar experiências, com no máximo 80 palavras.'
      },
      {
        role: 'user',
        content: `Cargo desejado: ${targetRole || 'não informado'}\nExperiência: ${experience || 'não informada'}\nCompetências: ${skills || 'não informadas'}`
      }
    ]
  });

  return response.output_text.trim();
}

module.exports = { improveSummary };
