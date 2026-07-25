# SIGOM v2 — fases 1 a 6 (rebuild completo)

## Fase 1 — login + dashboard de obras em tempo real
- Login por **e-mail + senha** via Supabase Auth (substitui o login por usuário/hash local).
- Dashboard consumindo a tabela `obras` do Supabase **em tempo real** (nada de xlsx local).
- Filtros por RM, por status de IDP e busca livre (OPUS, contrato, empresa, OM beneficiada).
- Cartões de resumo (total de obras, valor total, % medido médio, obras em atraso crítico).

## Fase 2 — Grupos de obras (aba "Grupos")
- Lista de grupos existentes (`grupos`) com contagem de obras.
- Criar novo grupo, ver obras associadas, adicionar obras via modal com busca e "selecionar todas
  da busca", remover obra, arquivar/reativar, excluir grupo.
- Permissões seguem a RLS já existente (só `administrador`/`editor` editam).

## Fase 3 — Ficha FIO (aba "Ficha FIO")
- Réplica do layout institucional aprovado pelo Cel LH: cabeçalho em gradiente azul, barra OPUS/AO,
  bloco amarelo de características técnicas (Concepção, Fundações, Estrutura, Cobertura, Paredes,
  Terraplenagem), tabela de dados, foto e observações.
- Campos narrativos (Título, AO, características, PA, Observações, Data) são editáveis
  (`contenteditable`) e persistidos em `fio_edicoes.conteudo` — servidor, não mais localStorage.
- Campos financeiros/operacionais (Valor, Empenho, Saldo, % Executado, Média mensal, IDP, Início,
  Entrega) são **sempre lidos ao vivo da tabela `obras`**, nunca congelados na ficha — mantém a regra
  já validada no sistema antigo de que a base de portfólio é a fonte confiável, não a apresentação.
- Upload de foto com redimensionamento em canvas antes de subir, salva no bucket privado
  `fio-fotos` do Supabase Storage (bucket e políticas de RLS já existiam, reaproveitados).
- Exportação: Imprimir/PDF (via impressão do navegador), Baixar PNG e Copiar imagem para colar
  direto no PowerPoint (via `html2canvas` + Clipboard API).
- Permissões: edição/upload de foto restrita a `administrador`/`editor`; demais perfis veem a
  ficha em modo leitura, com exportação liberada para todos.

## Fase 4 — Painel administrativo (aba "Administração", só visível para perfil administrador)
- Lista todos os usuários (`profiles`) com nome, e-mail, perfil e status ativo/inativo.
- Trocar perfil e ativar/desativar usuário: feito **direto pelo navegador**, protegido pela política
  de RLS `profiles_admin_update` já existente (só administrador consegue). Nenhuma função de servidor
  necessária para isso.
- **Criar novo usuário** e **redefinir senha de um usuário**: essas duas ações exigem privilégio de
  administrador do Supabase Auth, que só pode rodar no servidor — por isso usam uma Netlify Function
  nova (`netlify/functions/admin-users.mjs`, acessível em `/api/admin-users`).
- Um administrador não consegue alterar o próprio perfil nem se autodesativar pela tela (trava de
  segurança simples para não se trancar fora do sistema sem querer).

### ⚠️ Configuração obrigatória antes do deploy funcionar
A Netlify Function usa a **service role key** do Supabase — uma credencial com acesso total ao banco,
que NUNCA deve ir para o navegador nem para o Git. Configure como variável de ambiente no Netlify:

1. No Supabase: **Project Settings → API → Project API keys → `service_role`** (copie o valor secreto).
2. No Netlify: **Site settings → Environment variables**, adicione:
   - `SUPABASE_URL` = `https://vstqinwjlhrrouxvwzpx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (cole a chave `service_role` copiada do Supabase)
3. Faça um novo deploy (ou "Clear cache and deploy") para a function pegar as variáveis.

Sem isso configurado, a aba Administração aparece normalmente, mas "Criar usuário" e "Redefinir senha"
retornam erro — o resto do sistema continua funcionando normalmente.

O `package.json` na raiz do projeto declara a dependência `@supabase/supabase-js` usada pela function;
o Netlify instala isso automaticamente durante o build.

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

## Fase 5 — Geração do FIO em PowerPoint (Python, sem PowerShell/COM)
Substitui completamente o script `Gerar_FIO_SIGOM.ps1` (que dependia de Excel/PowerPoint instalados
no Windows local) por uma Netlify Function em **Python puro** (`netlify/functions/gerar-fio.py`),
que roda na nuvem e não precisa de Office instalado em lugar nenhum.

- Usa exatamente o mesmo modelo aprovado pelo Cel LH (`FIO_SIGOM_modelo.pptx`, incluído no pacote),
  com os 3 tipos de slide originais: capa, divisória de RM e ficha da obra.
- Agrupa as obras selecionadas por RM automaticamente e gera: 1 capa + 1 divisória por RM + 1 ficha
  por obra — mesma lógica do gerador antigo.
- Os campos financeiros/operacionais (Valor, Empenho, % Executado, Média mensal, IDP, Início, Entrega,
  AO) são buscados **ao vivo da tabela `obras`** no momento da geração — nunca de uma cópia estática.
- Os campos narrativos (Título, Concepção, Fundações, Estrutura, Cobertura, Paredes, Terraplenagem,
  PA, Observações) vêm do que foi preenchido na aba "Ficha FIO" (`fio_edicoes`). Campo vazio =
  aparece como "(A PREENCHER)" no slide, igual ao comportamento do script antigo.
- **Onde gerar:**
  - Na aba **Ficha FIO**, botão "Gerar PPTX (FIO oficial)" → gera só a obra aberta.
  - Na aba **Grupos**, botão "Gerar PPTX (FIO do grupo)" → gera todas as obras do grupo selecionado
    de uma vez (equivalente ao antigo fluxo de "gerar FIO de N obras" por lote).
- Não usa a service role key — qualquer usuário autenticado pode gerar/exportar (é uma ação de
  leitura, protegida pelas mesmas políticas de RLS que já liberam SELECT em `obras`/`fio_edicoes`).
- Sem dependências Python externas (só biblioteca padrão) — não precisa de `pip install` nem de
  configuração adicional no Netlify além do que a Fase 4 já pedia.
- **Testado e validado** nesta sessão: gerei um PPTX de exemplo com 2 obras em RMs diferentes,
  validei a estrutura OOXML (relacionamentos, content-types) e renderizei via LibreOffice para
  conferir visualmente — abriu perfeitamente, sem slides quebrados ou imagens ausentes.

---

## Migrações aplicadas no Supabase até agora (nenhuma altera dados existentes nem políticas de RLS)
- `fio_edicoes_obra_id_unique`: restrição UNIQUE em `obra_id` (necessária para salvar a ficha FIO
  como "uma ficha por obra" via upsert).
- `profiles_add_email_column`: adicionada coluna `email` em `profiles` (preenchida a partir de
  `auth.users`), e o trigger `handle_new_user` passou a gravar o e-mail automaticamente também
  para novos usuários. Necessário para o painel administrativo listar os usuários sem precisar
  de outra chamada de servidor.
- Fase 6 não precisou de nenhuma migração nova — `obras_paralisadas` e `objetivos_auditoria` já
  tinham exatamente a estrutura (e o UNIQUE em `chave`) necessária.

## Fase 6 — Obras Paralisadas e Objetivos (auditoria)

### Aba "Obras Paralisadas"
- Réplica direta da página offline `obras_paralisadas.html`, agora ligada à tabela
  `obras_paralisadas` em vez de `localStorage` do navegador (ou seja: visível para todo mundo,
  não só em quem cadastrou, e sobrevive a trocar de computador).
- Cadastro com OPUS, contrato, título, **processo crítico (1 a 4, com a mesma cor de cada nível
  do sistema antigo)** e observações.
- Exclusão é "soft delete" (marca `ativo=false`) em vez de apagar de verdade — nada se perde por
  engano.
- Edição/cadastro restritos a `administrador`/`editor` (RLS `paralisadas_write` já existente);
  demais perfis veem a lista em modo leitura.

### Aba "Objetivos"
- ⚠️ **Escopo ajustado — leia antes de cobrar paridade total com o sistema antigo.** O
  `objetivos.html` offline era, na prática, um mini-sistema à parte: motor de análise automática
  para 5 "Objetivos" distintos (Objetivo 1 a 5), cada um cruzando dados com planilhas próprias
  específicas (fora do modelo de dados do Supabase), gerando KPIs e gráficos por objetivo. Eu não
  tenho as planilhas-fonte nem as regras de negócio completas desses cruzamentos nesta sessão, e a
  tabela `objetivos_auditoria` que já existia no banco (criada em sessão anterior) foi desenhada
  para cobrir só a **camada de auditoria manual** — não o motor de análise inteiro.
- O que foi entregue: uma tela de **registro e consulta de auditoria** — cadastrar um objetivo
  (rótulo livre, ex: "Portfólio Geral" ou "OBJ5"), opcionalmente ligado a um OPUS/contrato, com
  situação manual (mesmas 6 opções do sistema antigo: Concluída, Dentro do prazo, Adiantada, Em
  atenção, Atrasada, Não localizada), observação e marcação de "auditado".
- Permissão de escrita: `administrador`, `editor` e `auditor` (RLS `pode_auditar()`, já existente
  — é o único módulo em que o perfil Auditor tem permissão de edição, assim como no sistema antigo).
- Se você quiser o motor de análise automática dos 5 Objetivos de volta, me passe as planilhas-fonte
  e as regras de classificação de cada um — dá pra construir como uma Fase 7 à parte.

---

## Rebuild completo — visão geral do que foi entregue

| Fase | Módulo | Status |
|---|---|---|
| 1 | Login (Supabase Auth) + Dashboard de obras em tempo real | ✅ |
| 2 | Grupos de obras | ✅ |
| 3 | Ficha FIO (edição + exportação PNG/PDF) | ✅ |
| 4 | Painel administrativo (usuários) | ✅ |
| 5 | Geração do FIO em PowerPoint (Python, sem PowerShell/COM) | ✅ |
| 6 | Obras Paralisadas + Objetivos (auditoria) | ✅ (objetivos com escopo ajustado — ver acima) |

Todas as fases foram publicadas como um único pacote cumulativo (`SIGOM_v2_faseN.zip`) — o processo
de deploy é sempre o mesmo: copiar o conteúdo para a raiz do repositório `SIGOM-Enterprise` e dar
push (Netlify faz o resto automaticamente).
