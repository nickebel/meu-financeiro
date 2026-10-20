# Meu Financeiro

Aplicação pessoal de finanças em português (pt-BR), valores em reais (BRL), interface responsiva em bege, autenticação Supabase e dados protegidos por Row Level Security (RLS).

## Arquivos
- `index.html`, `style.css`, `app.js`: interface e aplicação.
- `config.example.js`: modelo de configuração pública do Supabase.
- `supabase/schema.sql`: tabelas, índices e políticas RLS; inclui migração para armazenar a bandeira do cartão.
- `favicon.svg`: ícone do projeto.
- `.nojekyll`: marcador para GitHub Pages.

## 1. Configure o Supabase
1. Crie um projeto em https://supabase.com/.
2. Abra **SQL Editor**, crie uma consulta, cole todo o conteúdo de `supabase/schema.sql` e execute.
3. Em **Project Settings → API** (ou Connect), copie a Project URL e a chave pública `anon`/`publishable`.
4. Crie um arquivo chamado `config.js` na raiz, copiando o conteúdo de `config.example.js` e substituindo os dois valores de exemplo.
5. Se o banco já existia, execute novamente o conteúdo atualizado de `supabase/schema.sql`; a coluna de bandeira será adicionada sem apagar os cartões existentes.
6. Em **Authentication → URL Configuration**, configure **Site URL** e **Redirect URLs** para `https://nickebel.github.io/meu-financeiro/`.
7. Mantenha o provedor Email habilitado. Se a confirmação de e-mail estiver ativa, confirme o e-mail após criar a conta.
8. Nunca coloque a chave `service_role`, senha do banco ou outros segredos no navegador.

## 2. Publique no GitHub Pages
1. Abra **Settings → Pages** neste repositório.
2. Selecione **Deploy from a branch**, branch `main`, pasta `/(root)`, e salve.
3. Aguarde o deploy e abra https://nickebel.github.io/meu-financeiro/.
4. O `config.js` é necessário para autenticação e conexão com o Supabase. O arquivo `.gitignore` ignora esse arquivo por padrão. Para GitHub Pages, você precisa adicioná-lo conscientemente ao repositório contendo **somente** a URL e a chave pública anon/publishable. Essas informações são públicas por natureza; a segurança dos dados deve ser garantida por RLS. Nunca adicione `service_role`.

## 3. Teste antes de usar
- Crie uma conta, confirme o e-mail (se solicitado) e entre.
- Adicione entrada, despesa, cartão, parcela, conta e meta.
- Teste editar, excluir e marcar conta como paga.
- Crie uma segunda conta de teste e confirme que ela não consegue ver os dados da primeira.
- Confira no Supabase que RLS está habilitado nas cinco tabelas.

## Observações
- O site não se conecta automaticamente ao seu banco ou cartão bancário. Os lançamentos são inseridos manualmente.
- O valor mensal de cada compra parcelada é calculado como `valor total ÷ número de parcelas`. A versão inicial não gera automaticamente lançamentos futuros de parcelas nem faturas detalhadas.
- O saldo do painel é calculado como entradas menos despesas registradas no mês selecionado, não como saldo bancário sincronizado.
- A chave anon/publishable pode aparecer no navegador, mas a segurança depende de políticas RLS corretas.
- O Supabase JS e as fontes são carregados por CDN; é necessária conexão à internet.


## 4. Instale como aplicativo (PWA)
- O projeto inclui `manifest.webmanifest`, ícones, botão de instalação e service worker para o shell estático.
- Depois que o GitHub Pages publicar as alterações, abra `https://nickebel.github.io/meu-financeiro/` em HTTPS.
- **Android/Chrome:** use o botão “Instalar como aplicativo” no site, ou o menu do navegador → “Instalar app”.
- **iPhone/iPad:** abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.
- **Computador:** use o botão do site ou a opção de instalar no menu do Chrome/Edge, quando disponível.
- O aplicativo instalado continua usando o Supabase na nuvem. É necessário ter internet para entrar, sincronizar e ler/gravar seus dados. O cache guarda apenas recursos estáticos do site, não os dados financeiros privados.
- Isso instala o PWA pelo navegador; publicar em Google Play ou App Store exigiria uma etapa separada de empacotamento e publicação.
