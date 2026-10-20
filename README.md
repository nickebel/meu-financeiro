# Meu Financeiro

Aplicação pessoal de finanças em português (pt-BR), valores em reais (BRL), interface responsiva em bege, autenticação Supabase e dados protegidos por Row Level Security (RLS).

## Configuração
Veja as instruções completas neste arquivo após os demais arquivos serem enviados. Execute `supabase/schema.sql` no SQL Editor do Supabase, configure `config.js` com Project URL e chave pública anon/publishable, e ative GitHub Pages em Settings → Pages → Deploy from a branch → main → /(root).

Nunca use a chave `service_role` no navegador. Teste as políticas RLS com duas contas antes de cadastrar dados reais.