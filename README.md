# Meu Financeiro

Aplicação pessoal de finanças em português (pt-BR), valores em reais (BRL), interface responsiva verde e creme, autenticação Supabase e dados protegidos por Row Level Security (RLS).

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


## 5. Modo offline e aplicativos instaláveis

- O arquivo `offline-store.js` guarda os dados do usuário no IndexedDB do dispositivo e mantém uma fila de alterações pendentes.
- Ao voltar a conexão, o app tenta enviar as operações pendentes ao Supabase e atualizar o cache local. IDs são gerados localmente, para que uma criação e suas edições não gerem registros duplicados ao sincronizar.
- A indicação de estado no cabeçalho mostra quando o app está offline, quando há alterações pendentes e quando está sincronizado.
- O shell do site é cacheado pelo service worker; respostas privadas do Supabase não são colocadas no cache do service worker.
- A disponibilidade offline precisa ser preparada em cada dispositivo: abra o app e faça login online pelo menos uma vez para baixar seus dados. O armazenamento local de um aparelho não aparece automaticamente em outro; o Supabase faz a ponte quando a conexão volta.
- Se abrir sem internet depois de uma sessão anterior, o app usa o perfil local lembrado naquele dispositivo. A autenticação e a sincronização na nuvem exigem conexão quando a sessão local não puder ser renovada.
- **Privacidade local:** dados financeiros no IndexedDB são armazenados no perfil local do navegador/app e não são criptografados pela camada de sincronização. Proteja o dispositivo com senha/biometria e não compartilhe o perfil do sistema operacional. Sair da conta remove o marcador de acesso offline, mas não apaga automaticamente a fila local ainda não sincronizada.
- Para criar os pacotes nativos, o repositório contém configuração do Capacitor para Android e Electron para Windows. Os arquivos são empacotados com o SDK do Supabase local, para que o código de login seja carregado mesmo sem internet; chamadas à nuvem, naturalmente, aguardam conexão.

### Gerar os instaladores

1. Abra a aba **Actions** do GitHub e selecione **Build Meu Financeiro for Android and Windows**. A compilação é iniciada automaticamente em alterações relevantes ou pode ser iniciada manualmente por **Run workflow**.
2. Quando a execução terminar, abra-a e baixe os artefatos:
   - `Meu-Financeiro-Android-APK`: APK de depuração para instalar no Android.
   - `Meu-Financeiro-Windows`: instalador Windows e versão portátil `.exe`.
3. Os artefatos gerados pelo fluxo ficam disponíveis por 14 dias. O APK de depuração não é um pacote assinado para publicação na Google Play.
