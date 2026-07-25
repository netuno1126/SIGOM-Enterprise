# Checklist de Homologação — Fase 3

## Autenticação
- [ ] Login por e-mail e senha.
- [ ] MFA TOTP obrigatório.
- [ ] Sessão AAL2 exigida.

## Visão Geral
- [ ] 557 obras carregadas ou quantidade atual do Supabase.
- [ ] Filtros de RM, contratante, empresa e grupo funcionam.
- [ ] Valores monetários completos com centavos.
- [ ] Empenhado aparece antes de medido no gráfico correspondente.

## Visão da Obra
- [ ] Pesquisa por OPUS, contrato, obra, empresa, OM e RM.
- [ ] Primeira linha contém informações financeiras.
- [ ] Segunda linha contém os diversos prazos.
- [ ] Data da Ordem de Serviço é exibida quando disponível.
- [ ] Término da vigência é exibido quando disponível.
- [ ] Curva de execução mostra as medições disponíveis.
- [ ] Informações do JSON legado são preservadas.

## Análises
- [ ] Todos os gráficos respeitam os filtros.
- [ ] Filtro por grupo afeta as análises.
- [ ] Dias sem medir exibe nome completo no tooltip.
- [ ] Distribuição do IDP usa as faixas oficiais.
- [ ] Maiores obras por valor funciona.
- [ ] Maiores empresas por valor funciona.
- [ ] Medido x estimado funciona.
- [ ] Vigências próximas e vencidas são calculadas.
- [ ] Tabela de obras críticas abre a Visão da Obra.
- [ ] Botões A− e A+ alteram as fontes entre 8 e 20 px.

## Regressão
- [ ] Baseline original continua acessível.
- [ ] Exportação CSV da Fase 2 permanece disponível.
- [ ] Impressão/PDF permanece disponível.
- [ ] Nenhuma escrita é realizada no Supabase.
