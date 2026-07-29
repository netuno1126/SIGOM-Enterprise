# SIGOM — Marco da Fase 12.30

## Finalidade

Corrigir o botão **Exportar Word** da aba Análises, que podia não produzir nenhuma ação visível após a captura assíncrona dos gráficos.

## Causa

O download era disparado somente após operações assíncronas. Alguns navegadores encerravam a ativação do usuário e bloqueavam o clique programático no link de download.

## Solução

1. Abrir `showSaveFilePicker()` imediatamente no clique;
2. capturar os gráficos;
3. montar o documento MHTML compatível com Word;
4. gravar o `Blob` diretamente no arquivo escolhido;
5. manter download tradicional e link manual como contingência.

## Banco de dados

Nenhuma migration ou alteração no Supabase é necessária.
