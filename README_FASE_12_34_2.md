# SIGOM — Fase 12.34.2

## Entrega

Esta atualização é incremental sobre a 12.34/12.34.1 e não substitui os módulos homologados.

### Novos módulos
- `public/app/alertas-medicao.html`
- `public/app/visao-diretor.html`
- `public/app/fase-12-34-2-integracao.js`
- `public/app/dashboard-projecoes-12-34-2.js`

### Banco
- `supabase/33_fase_12_34_2_alertas_diretor_obj5.sql`

O SQL cria/garante:
- alertas automáticos quando `% medido` aumenta;
- controle de alerta lido/não lido;
- lista oficial com 12 obras do Objetivo 5;
- trigger não destrutivo.

## Aplicar no repositório

1. Copie as pastas `public` e `supabase` sobre o repositório atual.
2. Execute na raiz do repositório:

```bash
python APLICAR_FASE_12_34_2.py .
```

O aplicador apenas acrescenta duas tags `<script>` e gera backups dos HTML antigos.

3. Execute a migration `33_fase_12_34_2_alertas_diretor_obj5.sql` somente se ela ainda não estiver aplicada.
4. Teste:
   - `/app/alertas-medicao.html`
   - `/app/visao-diretor.html`
   - `/app/objetivos.html`
   - `/app.html`

## Objetivo 5
A referência oficial passa a ser a lista de 12 OPUS fornecida para a Fase 12.34.2.

## Estimativa dos recursos
A camada de proteção bloqueia `Invalid Date`, anos absurdos e projeções acima de 30 anos. A função disponibilizada é:
`window.SIGOM_CALC_DURACAO_RECURSOS_12342(obra)`.

## Commit recomendado

```bash
git add .
git commit -m "feat: publicar Fase 12.34.2 com alertas de medição e Visão do Diretor"
git push origin main
```


## Complemento Frontend Completo

Esta revisão inclui explicitamente:
- aba 🔔 Atualizações de Medição;
- contador de alertas não lidos no cabeçalho da aba e no botão de integração;
- filtros por busca, RM, grupo e leitura;
- abertura direta da obra por Nº OPUS;
- botão individual e em lote para marcar como lido;
- aba Visão do Diretor;
- conteúdo executivo alinhado à palestra `Obj_Metas_2026_APG_07_08_2026 v3.pptx`;
- indicadores de referência da palestra: 52 obras PEEx; RP 0,57%; liquidação 39,3%; UFV 34/38 (89,47%); Obj 5 com 5/12 recontratadas (42%);
- integração entre Objetivos, Medições, Visão do Diretor e Dashboard.
