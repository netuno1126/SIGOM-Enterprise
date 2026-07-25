# SIGOM — Marco da Fase 5

## Objetivo

Disponibilizar administração e importações diretamente pela interface web, reduzindo a dependência de CMD, PowerShell, scripts Python e arquivos locais.

## Entregas

- Central de importações com pré-validação e confirmação.
- Importação de obras/contratos, portfólio, saldos alongados e objetivos.
- Atualização pela chave natural correspondente a cada base.
- Preservação das colunas originais de obras no JSON `dados`.
- Registro do arquivo, usuário, quantidade lida, processada e erros.
- Importação de grupos e vínculos pelo navegador.
- Administração de usuários por Netlify Function.
- Consulta do histórico e auditoria.
- Controle de acesso por Administrador, Editor, Auditor e Consulta.

## Segurança

- `service_role` somente na Netlify Function.
- Frontend usa apenas publishable key.
- Netlify Function valida o JWT e confirma o perfil administrador no banco.
- RLS aplicado às tabelas de importação e administração.
- MFA/AAL2 herdado da Fase 1.

## Limites desta entrega

- Não realiza restauração integral do banco pelo navegador.
- Não exclui registros que estejam ausentes numa nova planilha.
- Não publica automaticamente em produção.
- Arquivos muito grandes devem ser homologados antes da implantação definitiva.
