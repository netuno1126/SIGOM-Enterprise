# SIGOM — Marco da Fase 12.31

## Objetivo

Alinhar a interface e as permissões operacionais aos perfis institucionais.

## Matriz de permissões

| Operação | Administrador | Editor | Auditor | Consulta |
|---|---:|---:|---:|---:|
| Visualizar Dashboard | Sim | Sim | Sim | Sim |
| Visualizar Ajuda | Sim | Sim | Sim | Sim |
| Criar/editar grupos | Sim | Sim | Não | Não |
| Criar/editar subgrupos | Sim | Sim | Não | Não |
| Vincular obras | Sim | Sim | Não | Não |
| Arquivar/excluir grupos | Sim | Sim | Não | Não |
| Criar/editar usuários | Sim | Não | Não | Não |

## Implementação

- `public/app.html`: adiciona as classes `editor-ok` e `can-edit-ok`;
- `public/app/dashboard.html`: separa controles operacionais de controles exclusivos de usuários;
- `adminOnly`: visível para Administrador e Editor;
- `userAdminOnly`: visível somente para Administrador;
- o botão Ajuda passa a existir estaticamente no menu para todos os perfis;
- `isAdminSIGOM()` passa a representar permissão operacional de Administrador ou Editor;
- cadastro de usuários continua validado por `isAdministradorSIGOM()`.

## Supabase

Nenhuma migration nova. As policies existentes usam a regra institucional de edição para Administrador e Editor.
