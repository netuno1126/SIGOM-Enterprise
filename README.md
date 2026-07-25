# SIGOM v2 — fase 1 (login + dashboard de obras em tempo real)

## O que já está funcionando nesta entrega
- Login por **e-mail + senha** via Supabase Auth (substitui o login por usuário/hash local).
- Dashboard consumindo a tabela `obras` do Supabase **em tempo real** (nada de xlsx local).
- Filtros por RM, por status de IDP e busca livre (OPUS, contrato, empresa, OM beneficiada).
- Cartões de resumo (total de obras, valor total, % medido médio, obras em atraso crítico).
- Todo o acesso passa pelas políticas de RLS já existentes no projeto Supabase `sigom-enterprise`
  (nenhuma alteração de permissões foi feita).

## Como publicar
1. Baixe/clone o repositório `SIGOM-Enterprise` no GitHub.
2. Copie todo o conteúdo desta pasta (`index.html`, `assets/`, `netlify.toml`) para a raiz do repositório,
   substituindo os arquivos anteriores.
3. Commit + push para o branch conectado ao site `sigomv2` no Netlify.
4. O Netlify faz o deploy automático a partir do Git — nenhuma configuração adicional é necessária,
   pois a chave pública do Supabase (`anon key`) já está embutida no `app.js` (é segura para uso no
   navegador, a proteção real é feita pelas políticas de RLS no banco).
5. Login inicial: use as contas já existentes —
   - `fabiobarboza.dom@gmail.com` (Administrador)
   - `apgdom@apg.com` (Auditor)

## Dados
As tabelas do Supabase foram **zeradas** (mantendo a estrutura) para você recarregar o portfólio do zero.
Assim que quiser, posso montar a tela/rotina de importação de planilha (ou reimportar o backup que guardei
localmente antes de zerar, se preferir recuperar os 557 registros anteriores em vez de recomeçar).

## Próximas fases (ainda não incluídas nesta entrega)
Para não entregar 3.000 linhas de código sem testar nada, dividi o rebuild em fases. Esta é a Fase 1
(autenticação + visão consolidada de obras). Faltam:

- **Fase 2 — Grupos de obras**: tela de grupos ligada às tabelas `grupos`/`grupo_obras` (já existem e já
  têm RLS pronta).
- **Fase 3 — Ficha FIO (apresentação)**: tela de edição/visualização por obra, ligada a `fio_edicoes`.
- **Fase 4 — Painel administrativo**: cadastro de usuários (precisa de uma Netlify Function com a
  service role key do Supabase, já que criar usuários exige privilégio de admin — isso não pode rodar
  no navegador).
- **Fase 5 — Geração do FIO em PowerPoint**: reescrita em Python (`python-pptx`) rodando como Netlify
  Function, substituindo o script PowerShell local.
- **Fase 6 — Objetivos e obras paralisadas**: telas equivalentes às páginas `objetivos.html` e
  `obras_paralisadas.html` do sistema offline.

Me avise qual fase quer que eu construa em seguida.
