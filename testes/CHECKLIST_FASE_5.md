# Checklist de Homologação — Fase 5

## Acesso
- [ ] Consulta não consegue gravar.
- [ ] Auditor não consegue gravar.
- [ ] Editor importa dados, mas não administra usuários.
- [ ] Administrador acessa todos os módulos.
- [ ] MFA AAL2 continua obrigatório.

## Importações
- [ ] XLSX é lido corretamente.
- [ ] CSV é lido corretamente.
- [ ] Prévia aparece antes da gravação.
- [ ] Linhas sem OPUS são sinalizadas.
- [ ] Obras são atualizadas por OPUS + contrato.
- [ ] Valores com vírgula e centavos são preservados.
- [ ] Percentuais são preservados.
- [ ] JSON `dados` mantém colunas originais.
- [ ] Histórico registra resultado.
- [ ] Nova importação não exclui registros ausentes.

## Grupos
- [ ] JSON inválido é recusado.
- [ ] Grupo existente não é duplicado.
- [ ] Obra é localizada por OPUS e contrato.
- [ ] Vínculo existente não é duplicado.
- [ ] Obras não encontradas aparecem no relatório.

## Usuários
- [ ] Somente administrador lista usuários.
- [ ] Novo usuário é criado com senha provisória.
- [ ] Perfil é salvo em `profiles`.
- [ ] Usuário pode ser ativado/desativado.
- [ ] `service_role` não está no frontend nem no repositório.

## Regressão
- [ ] Dashboard carrega.
- [ ] Visão da Obra carrega.
- [ ] Análises carregam.
- [ ] Grupos e Portfólio carregam.
- [ ] FIO, Objetivos, Obras Paralisadas e Mobile continuam acessíveis.
