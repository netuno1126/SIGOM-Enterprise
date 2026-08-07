# SIGOM Fase 12.34.1 — Projeções de Engenharia

## Aplicação

Substitua no repositório:

```text
public/app.html
```

pelo arquivo do pacote.

## Regras implementadas

### Duração dos recursos

```text
meses estimados = saldo NE não liquidado / média mensal liquidada
```

Prioridades da média:

1. média das últimas liquidações válidas;
2. média mensal disponível na base;
3. sem estimativa quando não houver ritmo financeiro.

### Término físico

```text
meses restantes = (100 - percentual medido atual) / ritmo físico mensal
```

O ritmo utiliza regressão linear das últimas quatro medições válidas quando o histórico estiver disponível.

### Limites

- máximo de 360 meses;
- datas inválidas são rejeitadas;
- ritmo zero ou negativo gera “Não estimável”;
- obra com 100% gera “Concluída”.

## Git

```bash
git add public/app.html
git commit -m "fix: corrigir projeções física e financeira na Fase 12.34"
git push origin main
```

Após o deploy, use `Ctrl + Shift + R`.
