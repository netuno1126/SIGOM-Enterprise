# SIGOM Fase 12.2.2 — Dados online e logos

Correções:

- ligação direta dos registros Supabase às variáveis internas DATA, PORT e SALDOS do Dashboard homologado;
- desativação do carregador local legado durante a execução online;
- uso do Portfólio como contingência quando a tabela obras estiver vazia;
- políticas explícitas de leitura para usuários autenticados;
- logos DOM, SIGOM e DEC carregadas diretamente dos assets institucionais;
- mensagem de diagnóstico quando o Supabase retornar erro ou zero registros.

Execute `supabase/14_fase_12_2_2_leitura_dashboard.sql` antes da homologação.
