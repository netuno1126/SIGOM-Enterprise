# SIGOM — Fase 12.33 Institucional

## Consolidação

Esta entrega substitui as Fases 12.31, 12.32 e a versão preliminar da 12.33.

## Exportações da FIO

O exportador não reconstrói mais os documentos somente com os dados da planilha.
Ele materializa o conteúdo editado da FIO.

### Obra atual

Usa o DOM visível, permitindo exportar alterações que ainda não foram salvas.

### Grupo

Usa a última edição persistida de cada obra. Na ausência de edição, usa os dados originais.

### PowerPoint

Os textos são extraídos das células editadas e adicionados como caixas editáveis.
A fotografia é incorporada como imagem.

## Banco de dados

As migrations das Fases 12.32 e 12.33 já foram aplicadas no Supabase operacional.
