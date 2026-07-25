# Fase 11 — IA SIGOM e Briefings Inteligentes

## Objetivo
Adicionar um assistente gerencial fundamentado exclusivamente nos dados carregados do SIGOM. A IA não possui permissão para alterar dados operacionais.

## Capacidades
- perguntas em linguagem natural;
- briefing do Diretor;
- priorização de obras;
- matriz de riscos;
- análise de paralisações, objetivos, metas e alertas;
- escopo geral, crítico, paralisado, objetivos, alertas ou obra individual;
- histórico pessoal de consultas.

## Segurança
A chamada ao provedor ocorre em Netlify Function autenticada. A variável `OPENAI_API_KEY` não é pública. O payload usa apenas o contexto selecionado e a chamada define `store: false`.

## Limites
As respostas são recomendações. O responsável deve verificar os dados e tomar a decisão final.
