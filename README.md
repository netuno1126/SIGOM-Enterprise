# SIGOM Fase 12.34.6 — Estimativa de Duração dos Recursos

Correção da estimativa financeira para eliminar datas impossíveis como 01/05/4054.

## Método
- Saldo NE não liquidado = Total NE - Total Notas Fiscais.
- Prioridade do ritmo financeiro: média 90 dias em R$/mês; depois liquidação histórica mensalizada; depois média mensal global somente se tiver escala monetária plausível.
- Nunca transforma duração bruta sem limite em data.
- Acima de 360 meses: `> 30 anos — ritmo financeiro insuficiente`.
- Sem ritmo válido: `Não estimável — sem ritmo financeiro recente`.
- Saldo zerado: `0 meses — recursos liquidados`.
- Tendência física: regressão linear sobre as quatro medições datadas, limitada a 10 anos.

## Aplicação
1. Copie `public/app/fase-12-34-6-engenharia-recursos.js` para o repositório.
2. Em `public/app/dashboard.html`, imediatamente antes de `</body>`, inclua:

```html
<script src="/app/fase-12-34-6-engenharia-recursos.js"></script>
```

Commit sugerido:
`fix: corrigir estimativa de duração dos recursos com lógica de engenharia`
