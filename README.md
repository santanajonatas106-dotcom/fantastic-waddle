# CurriculoFacil IA

MVP de gerador de currículos profissionais em Node.js/Express, preparado para Neon Postgres e Render.

## Recursos já incluídos

- Página inicial responsiva
- Formulário para criação de currículo
- Ajuda de IA no resumo profissional (quando `OPENAI_API_KEY` estiver configurada)
- Visualização do currículo
- Download em PDF
- Estrutura de banco Neon
- Configuração de deploy no Render
- Páginas iniciais de Termos e Privacidade

## Executar localmente

1. Instale Node.js 20 ou superior.
2. Copie `.env.example` para `.env`.
3. Preencha `DATABASE_URL` com a conexão do Neon.
4. Rode:

```bash
npm install
npm run db:init
npm start
```

Abra `http://localhost:3000`.

## Configuração no Render

- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Variáveis necessárias:

- `DATABASE_URL`
- `SESSION_SECRET`
- `OPENAI_API_KEY` (opcional durante os testes)
- `MERCADO_PAGO_ACCESS_TOKEN` (será usado na próxima etapa)
- `PRICE_BRL=7.90`

## Antes de vender

Ainda é necessário:

1. Integrar e testar o pagamento Pix do Mercado Pago.
2. Bloquear o PDF até o pagamento ser aprovado.
3. Criar webhook de confirmação de pagamento.
4. Revisar Termos, Privacidade e atendimento conforme a LGPD e o CDC.
5. Trocar a senha do Neon que foi exposta anteriormente.
6. Fazer testes reais de cadastro, pagamento, PDF e dispositivos móveis.

Nunca envie chaves secretas para o GitHub.
