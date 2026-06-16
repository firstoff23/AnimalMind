# Pawra — Walkthrough das Novas Funcionalidades e Self-Healing

Este documento resume a migração, implementação, verificação e persistência de dados para as últimas atualizações do Pawra, com destaque especial para o **Modo Veterinário**, **Modo Família**, **Landing Page**, **Segurança de Endpoints**, **Sistema de Self-Healing com Aprendizagem**, **Dicionário de Alimentos** e o **Registo de Sintomas (Symptom Logger) & Exportação PDF**.

---

## 🚀 1. Sistema de Self-Healing com Aprendizagem (Recém-Ativado) ✅

Com a aplicação bem-sucedida do ficheiro de migração `20260605_self_healing_foundation.sql` no Supabase, a persistência e inteligência de auto-recuperação da app estão totalmente operacionais.

### Arquitetura e Componentes:
1. **Captura Global de Erros (`SelfHealingContext.tsx`):**
   * Intercepta `window.onerror` and `unhandledrejection` de forma silenciosa e resiliente.
   * Filtra erros gerados por extensões do browser.
   * Agrupa e conta a frequência de erros repetidos antes de escalar para estado crítico.
2. **Resiliência e Retries (`useAppHealing.ts`):**
   * Classifica erros em 7 categorias principais (Rede, Auth, RLS/Permissões, Câmara, Áudio, Erros de UI e falhas tRPC).
   * Implementa `withAutoRetry` usando backoff exponencial e *jitter* (variação aleatória) para evitar avalanche de pedidos em APIs falhadas.
   * Deteta padrões recorrentes: se um componente falha repetidamente (>3 vezes), escala o seu estado de saúde para `CRITICAL` e sugere resoluções inteligentes baseadas no histórico.
3. **Fronteiras de Erro Inteligentes (`ErrorBoundary.tsx`):**
   * Integração com o motor de autocura.
   * Tenta renderizar novamente (auto-retry) até 2 vezes de forma transparente.
   * Apresenta uma interface de utilizador polida em português, distinguindo falhas de carregamento de rede de crashes puros de lógica/render.
4. **Persistência Remota (Supabase):**
   * As tabelas `app_errors`, `app_healing_actions` e `app_health_state` registam todas as ocorrências e as ações automáticas tomadas.
   * RLS ativado: utilizadores apenas veem os seus registos de erro; utilizadores administradores têm acesso total.
   * Procedure agendada para limpar histórico com mais de 30 dias para otimização de espaço.

---

## 🩺 2. Modo Veterinário ✅

### O que foi feito:
* **Base de Dados:** Tabelas clínicas (`vet_pet_access`, `vet_shares`, `vet_notes`, `vet_alerts`) integradas no Supabase.
* **Funcionalidade E2E:** 
  1. **Atualização de Estado Clínico:** Mudança de estado de caso clínico de *Monitorizar* para *Estável* refletida em tempo real.
  2. **Notas Clínicas Internas:** Possibilidade de escrever notas visíveis apenas para a equipa médica.
* **Validação dos Dados:** Os dados foram verificados diretamente via Supabase (`scratch/check_vet_rows.js`), validando a gravação de notas internas e status com sucesso.

---

## 👨‍👩‍👧‍👦 3. Modo Família — Funcionalidades & UX ✅

* **Remoção de Membros:** Adicionado suporte para utilizadores abandonarem voluntariamente uma família (`family.leave` tRPC router).
* **Painel Inteligente:** Layout reestruturado para mostrar formulários de adesão e criação apenas quando sem família; se já em família, renderiza instantaneamente o painel de gestão com badges de cargos em tempo real e transições fluidas.

---

## 🎨 4. Landing Page — Melhorias Estéticas ✅

* **Hero Visual:** Enriquecido com imagens dinâmicas e grafismo moderno.
* **Tipografia e Grid:** Utilização de `text-wrap: balance` e otimização de grelha responsive para dispositivos mobile.

---

## 5. Verificação Técnica Geral ✅

### Suite de Testes Unitários:
* **102/102 testes a passar** com sucesso (Vitest).
* Cobertura unitária adicionada para as heurísticas de retries, classificação e detecção de ciclos do motor de autocura.

### Compilação:
* `pnpm run check` corre sem qualquer erro de tipos TypeScript (0% de erro).

---

## 🎨 6. UI/UX Global — Design System + Componentes Base (Recém-Ativado) ✅

### O que foi feito:
1. **Design Tokens (`client/src/styles/design-tokens.css`):**
   * Configuração de cores profundas em dark mode: `--color-bg: #0a0a0b`, `--color-surface: #111113`.
   * Cores de acento: verde (`#22c55e`), aviso/alerta (`#f59e0b`).
   * Tipografia profissional Satoshi importada via CDN.
   * Espaçamento base de 4px e arredondamentos generosos para cartões (`16px`) e pílulas (`9999px`).
   * Sombras escuras calibradas e transições fluidas de `150ms` (cubic-bezier).

2. **Componentes base unificados:**
   * **Button:** Estilizado com acento verde para botões primários, variantes ghost e destrutivas, todos com efeito de escala ao clicar.
   * **Card:** Fundo escuro com borda subtil semitransparente e glow verde suave ao passar o rato (hover).
   * **Badge:** Cores mapeadas para o estado de saúde (verde para saudável, âmbar para alerta, vermelho para crítico, azul para info).
   * **Avatar:** Placeholder de pata de animal estilizada em SVG inline.
   * **EmptyState:** Ilustração de pata a flutuar com animação SVG e botão de Call-To-Action.
   * **Skeleton:** Efeito shimmer moderno para o carregamento em vez de piscar simples.

3. **Logótipo Corporativo SVG (`Logo.tsx`):**
   * Desenho inline com pata estilizada integrada com ondas de frequência áudio. Funciona em 24px e 200px.
   * Integrado no `Header.tsx` e `LandingPage.tsx` para substituição dos emojis anteriores.

4. **Navegação Responsiva (BottomNav & Sidebar):**
   * **BottomNav:** Barra inferior com 4 ícones estáticos para mobile (Dashboard, Gravar, Animais, Perfil) escondida em ecrãs médios/grandes.
   * **Sidebar:** Barra lateral colapsável para desktop com o logótipo oficial no topo, links centrais e painel com foto/iniciais e botão de logout no fundo.
   * Ambos integrados perfeitamente no layout global autenticado em `App.tsx`.

### Verificação Técnica:
* **Compilação:** Resolvido erro de tipo no avatar do utilizador no menu lateral e aviso de ordem de `@import` nos estilos globais. `pnpm run check` termina agora com sucesso total (0 erros de tipo).
* **Build de Produção:** `pnpm run build` compila perfeitamente tanto o bundle do cliente quanto o do servidor.
* **Testes unitários:** Todos os 102 testes do Vitest continuam a passar com 100% de sucesso.

---

## 📱 7. Conetividade Android Capacitor & Configurações de Segurança ✅

### O que foi feito:
* **Capacitor Configuration:** O arquivo [capacitor.config.ts](file:///D:/Pawra/capacitor.config.ts) foi configurado com `server.url` apontando para `https://Pawra.vercel.app` para que os assets e requisições da web app carreguem a partir do servidor de produção no ambiente nativo.
* **Network Security Configuration:** Criamos o arquivo [network_security_config.xml](file:///D:/Pawra/android/app/src/main/res/xml/network_security_config.xml) habilitando tráfego claro (cleartext) e HTTPS de forma segura para os domínios `Pawra.vercel.app` e `yuzqxrmtbqlnalpjehno.supabase.co`.
* **Android Manifest:** Vinculamos a configuração de segurança em [AndroidManifest.xml](file:///D:/Pawra/android/app/src/main/AndroidManifest.xml) usando `android:networkSecurityConfig="@xml/network_security_config"` no `<application>` e validamos que a permissão `android.permission.INTERNET` está devidamente declarada.
* **Resolução Dinâmica de URL do tRPC:** Modificamos o arquivo [main.tsx](file:///D:/Pawra/client/src/main.tsx) utilizando a biblioteca core do Capacitor para detectar se o app está rodando de forma nativa (`Capacitor.isNativePlatform()`), resolvendo a URL do tRPC de forma absoluta (`https://Pawra.vercel.app/api/trpc`) apenas na app Android, mantendo o fallback relativo `/api/trpc` no navegador web convencional.

### Verificação Técnica:
* **Commit do Código:** Todas as alterações foram adicionadas e salvas com a mensagem de commit correspondente.
* **Build local e Capacitor Sync:** O comando `pnpm run build && npx cap sync` foi executado com sucesso, sincronizando todos os assets gerados para a pasta nativa do projeto Android.
* **Gradle Build:** Compilamos a aplicação Android localmente executando `.\gradlew.bat assembleDebug` de dentro da pasta `android`, gerando com sucesso o arquivo APK final em [app-debug.apk](file:///D:/Pawra/android/app/build/outputs/apk/debug/app-debug.apk) (tamanho aproximado de ~33.5 MB).
* **Suite de Testes Unitários:** Todos os **102 testes do Vitest** passam com 100% de sucesso.

---

## 8. Dicionário de Alimentos (Nutrição Segura) ✅

### O que foi feito:
* **Base de Dados:** Criada a tabela `foods` com o ficheiro de migração `20260608_food_dictionary.sql`, contendo restrições de severidade (`safe`, `caution`, `dangerous`, `toxic`), Row Level Security (RLS) protegendo gravações por administrador, e populada com um seed de 30 alimentos em português e inglês detalhados com sintomas clínicos e diretrizes médicas reais.
* **Interface Web e Mobile:** Criada a página [FoodSearchPage.tsx](file:///D:/Pawra/client/src/pages/FoodSearchPage.tsx) para consulta em tempo real:
  - O utilizador pode selecionar a espécie do seu animal (Cão, Gato, Coelho, Ave) com auto-seleção inteligente baseada no perfil do animal ativo.
  - Caixa de pesquisa responsiva com sugestões rápidas e badges de cores dinâmicas indicando o risco e o nível de severidade clínica.
  - Alerta de emergência destacado ("O que fazer") para alimentos perigosos ou tóxicos.
* **Backend tRPC:** Expostas as rotas `search`, `getById` e `getAll` na camada de dados (`foodsRouter` em `server/routers/foods.ts`), de livre acesso público para garantir que utilizadores sem login efetuado possam usar o dicionário rapidamente.
* **Navegação:** Rota registada globalmente e ligações rápidas integradas de forma elegante no menu lateral (desktop), na barra de navegação inferior (mobile) e nas ações rápidas da página principal do utilizador (dashboard).
* **Testes e Tipos:** Desenvolvidos testes em `server/foods.test.ts` que validam o cálculo de severidade por espécie, listagem e pesquisa de sinónimos. TypeScript compilado com sucesso total (0 erros) e todos os testes unitários passando.

---

## 🛡️ 9. Segurança dos Endpoints de Saúde & Classificador Heurístico Offline ✅

### O que foi feito:
* **Segurança do Health Router**: Refatoramos `server/routers/health.ts` para que todas as ações efetuem verificação de permissões do utilizador sobre o animal antes de consultar ou modificar dados (vacinas e registos de saúde). Criamos os métodos `getVaccineById` e `getHealthRecordById` em `server/db.ts` para resolver o `animalId` correspondente antes de validações de escrita em pedidos de eliminação.
* **Classificador Heurístico Offline**: Refatoramos `client/src/lib/localClassifier.ts` para implementar uma análise de áudio matemática baseada em recursos de amplitude (RMS) e taxa de cruzamento por zero (ZCR). Se a app estiver offline e o carregamento do modelo YAMNet a partir do TFHub CDN falhar devido a falta de ligação à internet, a app utiliza este motor de heurísticas local para inferir o estado do animal com base no áudio capturado (evitando gerar resultados puramente aleatórios).
* **Testes Unitários de Segurança**: Criamos 14 testes unitários completos em `server/health.test.ts` que validam as permissões em todos os endpoints de saúde para utilizadores autorizados e não autorizados. Todos os testes estão a passar com 100% de sucesso.

---

## 📋 10. Registo de Sintomas (Symptom Logger) & Exportação PDF ✅

### O que foi feito:
* **Persistência de Dados**: O registo de sintomas foi integrado de forma limpa na tabela existente `health_records` usando `record_type = 'notes'` e `category = 'symptom'`. O campo `product` guarda o nome do sintoma (ex: "vomiting", "lethargy"), o campo `result` guarda o nível de gravidade ("low", "medium", "high") e o campo `notes` armazena as observações clínicas.
* **Componente de Interface (UI)**: Implementamos a secção collapsible **7. Registo de Sintomas (Symptom Logger)** no ecrã de saúde do animal (`HealthBulletinTab.tsx`):
  - Listagem em tempo real com badges coloridos de gravidade (Leve/Moderado/Grave ou Mild/Moderate/Severe) com base nas preferências de idioma do utilizador.
  - Diálogo de confirmação para eliminação de registos.
  - Formulário para adicionar sintomas comuns (Vómitos, Letargia, Coceira, Perda de Apetite, Diarreia, Tosse, Febre) e opção "Outro" com campo de texto livre para sintomas personalizados.
* **Exportação para PDF**: Atualizamos o componente gerador de PDF (`HealthBulletinPDF.tsx` e `HealthPage.tsx`) para incluir e formatar a tabela completa de sintomas registados, facilitando a partilha presencial ou digital com médicos veterinários.
* **Localização**: Suporte completo a traduções dinâmicas em Português (`pt.json`) e Inglês (`en.json`).
* **Testes e Tipos**: Escrevemos testes unitários focados na validação do fluxo e contratos de dados para sintomas em `server/health.test.ts`. Todos os 103 testes do Vitest estão a passar com 100% de sucesso.

---

## 🍏 11. Dicionário de Alimentos Otimizado & Filtragem por Espécie ✅

### O que foi feito:
* **Filtros Simplificados**: Limitamos a seleção de espécies apenas a **Cão** (dog) e **Gato** (cat) na página [FoodSearchPage.tsx](file:///D:/Pawra/client/src/pages/FoodSearchPage.tsx), removendo as categorias secundárias de Aves e Coelhos para simplificar a usabilidade.
* **Divisão Visual Clara**: Os resultados da pesquisa agora são agrupados e mostrados em duas secções distintas com cores claras e design premium:
  - **Alimentos Seguros (Safe Foods)**: Card agrupador com margem e fundo verde suave (`emerald`).
  - **Alimentos Perigosos ou com Atenção (Dangerous or Caution Foods)**: Card agrupador com margem e fundo vermelho/rosa suave (`rose`).
* **Lógica de Filtros**: Alimentos comuns a ambas as espécies aparecem em ambos os filtros; alimentos específicos de apenas uma espécie aparecem apenas quando esta está selecionada.

---

## 🐕 12. Gestão do Perfil do Animal nas Definições & Limpeza de Navegação ✅

### O que foi feito:
* **Persistência do Peso**: Criamos a migração SQL [20260611_add_animal_weight.sql](file:///D:/Pawra/supabase-migrations/20260611_add_animal_weight.sql) para adicionar a coluna `weight VARCHAR(50)` na tabela `animals` no Supabase. Adicionamos suporte completo no backend (`db.ts`, mapeamento `mapDbAnimal`, e procedimentos de atualização/criação) e esquemas Zod (`routers.ts`).
* **Painel Centralizado nas Definições**: Desenvolvemos uma secção dedicada **Os Meus Animais (My Pets)** na página de [SettingsPage.tsx](file:///D:/Pawra/client/src/pages/SettingsPage.tsx):
  - **Carrossel de Seleção**: Permite escolher visualmente o animal ativo para edição rápida.
  - **Criação de Novos Animais**: Botão "+ Adicionar" integrado com a Drawer deslizante reutilizando o `AddAnimalForm` de forma responsiva.
  - **Edição Direta**: Formulário de alteração de Nome, Espécie, Raça (com dropdown dinâmico e opção "Outra"), Idade, Peso (ex: "12 kg") e Foto (conversão local imediata para base64 com preview circular e botão de câmara).
* **Navegação Simplificada**:
  - Removemos os separadores redundantes de `/perfil` (Animais) e `/user-profile` (Perfil do Utilizador) do [BottomNav.tsx](file:///D:/Pawra/client/src/components/BottomNav.tsx) e do [Sidebar.tsx](file:///D:/Pawra/client/src/components/Sidebar.tsx).
  - Atualizamos as rotas em [App.tsx](file:///D:/Pawra/client/src/App.tsx) para que acessos diretos aos links `/perfil` e `/user-profile` redirecionem instantaneamente para `/definicoes` de forma limpa.
  - Atualizamos os botões de voltar e redirecionamentos no dashboard e na página de detalhes do animal para usar `/definicoes`.

---

## 🛠️ 13. Verificação Técnica Final ✅

* **Compilação TypeScript**: `pnpm run check` correu sem qualquer erro ou aviso (0 erros de tipos).
* **Testes Unitários**: Executamos a suite de testes locais e todos os **103 testes** passaram com sucesso.
* **Build de Produção**: `pnpm run build` gerou com sucesso todos os assets estáticos do frontend e o bundle de produção do servidor NodeJS sem falhas de compilação ou lints.
* **Publicação**: As alterações foram commitadas e empurradas com sucesso para a branch principal (`git push origin main`).

---

## 🔍 14. Auditoria Visual UI/UX & Validação E2E (Fase de Verificação Completa) ✅

Efetuámos uma auditoria completa de todas as páginas da aplicação para validar a responsividade, alinhamentos, tamanhos de toque (mínimo 44x44px), acessibilidade e ausência de erros na consola do browser.

### Resultados da Auditoria:
* **Filtros e Layout do Dicionário de Alimentos**: Confirmada a segmentação visual clara entre *Alimentos Seguros* (verde emerald) e *Alimentos Perigosos* (vermelho/rosa rose) em ecrãs mobile e desktop. A seleção de espécies limita-se corretamente a Cão e Gato, com os alimentos comuns a aparecer em ambos os filtros e os exclusivos nos respetivos.
* **Perfil do Animal nas Definições**: Carrossel horizontal e formulário de edição direta de peso (com a nova coluna persistida no Supabase), idade, raça e nome a funcionar sem anomalias estéticas.
* **Navegação & Redirecionamentos**: Confirmação visual de que o separador `/perfil` foi inteiramente removido dos menus e que redireciona o utilizador com sucesso para `/definicoes`.
* **Resoluções e Responsividade**: Validação em viewports mobile (375x812) e desktop (1280x800).
* **Captura de Ecrãs**: Todos os screenshots antes e depois da auditoria foram capturados e guardados no diretório de artifacts com os sufixos `_mobile` e `_desktop` para análise e persistência.

### Validação Técnica E2E:
* **Playwright E2E Tests**: Executámos toda a suite de integração (`pnpm run e2e`), com **6/6 testes a passar** com sucesso (auth-callback, desktop-warning, history, login, pdf-export e recording).
* **Vitest Unit Tests**: Todos os **103/103 testes** do backend e lógica local passam com sucesso.
* **TypeScript & Build**: `pnpm run check` (0 erros de tipo) e `pnpm run build` compilam a 100%.

---

## 🌟 7. Melhorias da Ronda 2 (Round 2 Improvements) ✅

Nesta atualização, foram implementadas melhorias de robustez, usabilidade e conformidade visual para a Ronda 2:

### 1. Restauração e Integração da Página de Perfil (`/perfil`)
* A página de perfil foi totalmente restaurada para a rota `/perfil` (mapeada para `ProfilePage.tsx`), eliminando o redirecionamento cego para as definições.
* **Menus de Navegação Atualizados**: Tanto a barra inferior mobile (`BottomNav.tsx`) como a barra lateral de desktop (`Sidebar.tsx`) foram atualizados para incluir e apontar para `/perfil` ("Animais") e para `/capturar` ("Capturar"), substituindo atalhos antigos.
* O clique no utilizador ou avatar no fundo da barra lateral desktop redireciona agora intuitivamente para a página `/perfil` de forma amigável.

### 2. Separação de Fluxos de Captura: Gravador de Voz (`/gravar`) e Câmara (`/camera`)
* **Portal de Captura (`/capturar`)**: Criámos um ecrã de entrada moderno e responsivo (`CapturePortalPage.tsx`) que permite ao utilizador selecionar de forma simples e intuitiva o modo de captura pretendido:
  - **Gravar Áudio (`/gravar`)**: Para vocalizações e análise acústica.
  - **Câmara Visão (`/camera`)**: Para análise de postura e linguagem corporal com YOLOv8.
* **Separadores Independentes**: O gravador de áudio e a câmara foram dissociados para ecrãs e fluxos dedicados (`RecordingPage.tsx` e `CameraPage.tsx`), garantindo um design limpo e focado em cada funcionalidade nativa de hardware.

### 3. Novas Opções de Criação de Perfil de Animal
Ao adicionar um animal, o utilizador dispõe agora de três métodos organizados em separadores dinâmicos no formulário de criação:
1. **Manual**: Preenchimento convencional de todos os campos.
2. **Microchip**: Permite a criação simplificada e rápida fornecendo apenas o Nome e o Número de Microchip (validado estritamente para 15 dígitos numéricos).
3. **Boletim (OCR)**: Importação simulada através do carregamento do boletim de vacinas, com estado de processamento realista e mensagens de orientação.

### 4. Zonas de Carregamento de Media Padronizadas (Upload Zones)
Implementámos uma lógica visual unificada de carregamento para a foto do animal, boletim (OCR) e gravação de áudio, com suporte para 5 estados bem definidos:
* **Inativo (Idle)**: Estado inicial com zona tracejada, instrução de formato/tamanho (máx. 20 MB, JPG/PNG/PDF) e ícone chamativo.
* **A enviar (Uploading)**: Mostra uma barra de progresso em tempo real (`Progress`) com a percentagem de progresso de upload simulada.
* **A processar/analisar (Processing)**: Renderiza um indicador de carregamento (`Loader2`) animado sinalizando a análise ou processamento de IA/OCR.
* **Sucesso (Success)**: Exibe a imagem carregada em tamanho pequeno (ou ícone de documento no caso de PDF), nome do ficheiro e um badge verde de sucesso com opções para "Substituir" ou "Remover".
* **Erro (Error)**: Apresenta um aviso visual a vermelho com a respetiva mensagem de erro em português de Portugal. Tratamento inteligente de erros com mensagens específicas e botão para "Tentar novamente":
  - Formato não suportado: `"Formato não suportado. Usa JPG, PNG ou PDF."`
  - Tamanho excedido: `"Ficheiro demasiado grande. Máximo 20 MB."`
  - Falha de rede: `"Ligação interrompida. Tentar novamente."`
  - Permissão negada: Mostra botão para aceder às "Definições" do browser.

Estes componentes e ecrãs podem ser consultados diretamente nos ficheiros `client/src/pages/ProfilePage.tsx`, `client/src/pages/CapturePortalPage.tsx`, `client/src/pages/CameraPage.tsx` e `client/src/pages/RecordingPage.tsx`.

---

## 🎨 8. Ronda 3: Remoção Completa de Emojis & Polimento de Interface ✅

Nesta fase final de polimento e consistência visual, removemos todos os emojis hardcoded que eram utilizados como placeholders, ícones ou indicadores de estado, substituindo-os por elementos de design modernos e ícones SVG/Lucide de alta fidelidade:

### 1. Substituição de Emojis por Componentes & Ícones SVG
* **Indicadores de Estado (Dashboard e Comparação)**: Os círculos de cores que representam os estados emocionais (🔴, 🟡, 🟢, 🟠, 🔵, ⚪) foram eliminados. Em seu lugar, implementámos círculos estilizados nativos via CSS/SVG usando `STATE_COLORS`, garantindo um visual profissional, polido e consistente em todo o painel e tabelas.
* **Ícones de Espécies e Interface**: Os emojis `🐕` e `🐈` utilizados em carrosséis, tabs de alimentos, avatares de fallback e modais foram substituídos pelo ícone oficial `<PawPrint />`.
* **Outros Emojis da UI**:
  - Feedback de classificação `👍` / `👎` substituído por `<ThumbsUp />` e `<ThumbsDown />`.
  - Notas de eventos `📝` substituído pelo ícone `<FileText />`.
  - Estados vazios `🔍` / `🎙️` substituídos por `<Search />` e `<PawPrint />` animados.
  - Toasts e alertas foram limpos de caracteres emoji redundantes.

### 2. Resolução de Erros JSX e Compilação
* Corrigimos um erro de balanceamento de tags HTML/JSX no ficheiro [DashboardPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/DashboardPage.tsx) nos cartões de estado dominante e de crença consolidada POMDP. Os elementos de texto foram colocados novamente dentro do wrapper `<div>` correspondente, resolvendo a quebra do parser do compilador TypeScript.

### 3. Suite de Testes & Build
* **TypeScript Check**: O comando `pnpm run check` conclui com **0 erros de compilação**.
* **Vitest Unit Tests**: Todos os **103/103 testes** de lógica e base de dados passam com 100% de sucesso.
* **Production Build**: A compilação final da aplicação (`pnpm run build`) termina com sucesso tanto para os assets estáticos do cliente como para o bundle de servidor.

### 4. Auditoria Visual & Capturas de Ecrã
* Corrigimos o script de auditoria [run_audit_screenshots.js](file:///C:/Users/Alexandre/Documents/Pawra/scratch/run_audit_screenshots.js) para simular com sucesso uma sessão autenticada do Supabase no `localStorage` do browser e para simular `window.matchMedia` bypassando o `MobileOnlyGate`.
* Capturámos com sucesso novas imagens de ecrã para todas as rotas (Dashboard, Histórico, Alimentos, Definições, Gravação e Detalhe de Animal) sem qualquer emoji visível, mostrando os novos componentes e ícones de design premium.

---

## 🎨 9. Ronda 3.5: Polimento Visual e Unificação de Cabeçalhos (Round 3.5 Polish) ✅

Nesta ronda, focámo-nos na unificação do cabeçalho da aplicação, remoção de duplicados locais, diferenciação visual no portal de captura, melhorias no menu de navegação inferior para evitar scrolling horizontal a 390px, e eliminação de texto decorativo nos fundos das páginas de detalhes.

### 1. Eliminação de Texto Decorativo "DOG" / "CAT"
* Substituímos os textos decorativos em segundo plano nas páginas de detalhes de animais e de veterinário ([AnimalDetailPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/AnimalDetailPage.tsx) e [VetPetDetailPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/VetPetDetailPage.tsx)) por um ícone de pata neutro estilizado e rodado `<PawPrint size={140} />` com opacidade ultra reduzida.

### 2. Redesenho da Secção "Sobre" em Definições (`SettingsPage.tsx`)
* Redesenhámos por completo a secção de informações institucionais, removendo emojis e introduzindo o logótipo oficial do projeto em SVG ([Logo.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/components/ui/Logo.tsx)).
* Adicionámos uma grelha limpa com a versão (`v1.0.0 (offline-ready)`) e os modelos locais de IA (YAMNet, YOLOv8, ResNet), além de dois botões premium com bordas e preenchimento adequados ligando diretamente aos Termos e Políticas de Privacidade em `/privacidade` (usando os ícones `Shield` e `FileText`).

### 3. Padronização de Cabeçalhos Globais
* **Navegação Sem Setas**: Mapeámos as 6 rotas principais (`/dashboard`, `/perfil`, `/capturar`, `/alimentos`, `/historico`, `/definicoes`) em [Header.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/components/Header.tsx) para ocultar automaticamente o botão/seta de voltar. As páginas secundárias exibem a seta de voltar normalmente.
* **Títulos Dinâmicos**: O `Header` agora renderiza títulos amigáveis localizados em português/inglês para cada rota (ex: "Animais", "Capturar", "Câmara Visão") em vez do genérico "Pawra".
* **Eliminação de Cabeçalhos Locais Duplicados**: Removemos cabeçalhos e botões redundantes que estavam implementados localmente em [CameraPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/CameraPage.tsx), [VetPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/VetPage.tsx) e [VetDashboardPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/VetDashboardPage.tsx).

### 4. Otimização do Portal de Captura (`/capturar`)
* **Layout Assimétrico e Diferenciado**: Redesenhámos a página [CapturePortalPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/CapturePortalPage.tsx):
  - O cartão de **Gravar Áudio** é agora um bloco vertical de destaque (`h-52`) com um botão CTA direto "Gravar agora".
  - O cartão de **Câmara Visão** é um bloco horizontal secundário compacto (`h-32`) com o CTA direto "Analisar →".
* **Textos Curtos**: Assegurámos que todas as descrições dos cartões ocupam exatamente uma única linha para manter o aspeto premium e focado.
* **Remoção de Elementos Desnecessários**: Eliminámos emojis nos botões e o botão redundante "Voltar ao Dashboard", guiando o utilizador a navegar naturalmente pelos menus.

### 5. Reestruturação do Menu de Navegação Inferior (BottomNav)
* **Visual Consistente**: Unificámos o `strokeWidth` dos ícones no [BottomNav.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/components/BottomNav.tsx) para exatamente `2.0` em todos os estados.
* **Otimização Layout 390px (Mobile-First)**: Reescrevemos as classes de estilo em [index.css](file:///C:/Users/Alexandre/Documents/Pawra/client/src/index.css):
  - Mudámos o comportamento dos itens para `flex: 1 1 0%` sem largura mínima estrita, permitindo que caibam perfeitamente em ecrãs estreitos como viewports de 390px sem causar scrolling horizontal na barra.
  - Removemos o destaque de fundo arredondado (highlight blocky) que aparecia na tab ativa, mantendo apenas a mudança de cor do ícone e da legenda.
  - Alinhámos verticalmente todas as legendas à base inferior (bottom baseline).
  - Posicionámos o ícone de Gravação central de forma absoluta (`position: absolute`, `left: 50%`, `transform: translateX(-50%)`), garantindo que o botão flutuante permaneça sempre perfeitamente centrado e estável.

### 6. Verificação Técnica Completa
* **Compilação TypeScript**: O comando `pnpm run check` conclui com 0 erros de compilação.
* **Testes Unitários**: A suite completa de testes unitários (`pnpm test`) correu e passou com 100% de sucesso (**103/103 testes**).
* **Build de Produção**: O comando `pnpm run build` gerou o bundle de produção estático e o do servidor com sucesso.
* **Registo de Ecrãs (Screenshots)**: Tiramos e atualizámos novos screenshots demonstrando o aspeto final polido da aplicação.



## 📦 10. Ronda 5: TWA, Play Store e Assets de Lançamento (Round 5 TWA & Play Store) ✅

Nesta ronda final, empacotámos a aplicação PWA do Pawra como uma Trusted Web Activity (TWA) oficial para Android, gerámos o pacote de lançamento assinado de produção e estruturámos a presença de loja para a Google Play Store.

### 1. Inicialização e Configuração do Projeto TWA
* **Estrutura**: Criámos o diretório dedicado `android/twa/` e inicializámos o projeto utilizando o Bubblewrap:
  - `bubblewrap init --manifest https://Pawra.vercel.app/manifest.webmanifest`
* **Parâmetros de Projeto**:
  - **Nome e Short Name**: `Pawra`
  - **Package ID / Application ID**: `com.Pawra.app`
  - **Host**: `Pawra.vercel.app`
  - **Start Path**: `/`
  - **Status Bar Color**: `#22C55E`
  - **Splash Screen Color**: `#0A0A0B`
  - **Ícones**: Associados automaticamente a `/icons/icon-512x512.png` (com suporte para maskable adaptive icons).

### 2. Compilação e Assinatura Digital do Pacote (.aab)
* **Compilação Gradle**: Compilámos o projeto através do Gradle Wrapper diretamente, especificando a versão JDK 17 instalada no Bubblewrap e apontando o `ANDROID_HOME` para o SDK local do Bubblewrap. O build gerou com sucesso o pacote não assinado em `app/build/outputs/bundle/release/app-release.aab`.
* **Assinatura Digital**: Assinámos o pacote de lançamento com o certificado de produção gerado anteriormente (`Pawra-release.jks`) com o alias `Pawra`, utilizando o utilitário `jarsigner`:
  - `jarsigner -keystore ..\Pawra-release.jks -storepass Pawrapwd app-release.aab Pawra`
* **Armazenamento de Builds**: Criámos o diretório `android/builds/` e copiámos o pacote assinado final como `Pawra-v1.0.0.aab`.

### 3. Metadados e Presença de Loja
* Criámos o ficheiro de documentação [play-store-assets.md](file:///C:/Users/Alexandre/Documents/Pawra/play-store-assets.md) na raiz do projeto com toda a informação requerida para a publicação em duas línguas (Português de Portugal e Inglês dos EUA), respeitando os limites estritos de tamanho do Google Play Console e listando apenas as funcionalidades reais da aplicação (Mindi AI, Classificador Offline, Dicionário de Alimentos, Registo de Sintomas).

### 4. Passos Manuais de Publicação (Guia do Programador)
Para lançar a aplicação na Google Play Store, o programador deve seguir as seguintes etapas:
1. **Registo na Google Play Console**: Criar uma conta de programador na Google Play Console.
2. **Criar Nova Aplicação**: Introduzir o nome `Pawra`, definir como Aplicação Gratuita (Free) e selecionar o idioma principal (PT-PT).
3. **Carregar o Pacote (.aab)**: No separador "Versões de produção" ou "Testes fechados", carregar o ficheiro `android/builds/Pawra-v1.0.0.aab` assinado.
4. **Metadados e Imagens**: Preencher os campos de Título, Descrição Curta e Longa com os textos definidos em `play-store-assets.md`, e carregar o ícone de 512x512px gerado na ronda anterior.
5. **Digital Asset Links**: Como a app é uma TWA, a barra de navegação do browser desaparecerá assim que a relação de confiança for ativada pelo Google Play. O ficheiro [assetlinks.json](file:///C:/Users/Alexandre/Documents/Pawra/client/public/.well-known/assetlinks.json) já está live em `https://Pawra.vercel.app/.well-known/assetlinks.json` contendo o fingerprint SHA-256 correto.
6. **Enviar para Revisão**: Concluir o questionário de classificação de conteúdo (PEGI 3) e enviar a aplicação para aprovação final pela Google.

---

### 5. Validação e Qualidade Técnica
* **TypeScript compilation**: Executámos `pnpm run check` garantindo **0 erros** de compilação.
* **Unit tests**: Executámos `pnpm test` com todos os **103/103 testes** a passar com sucesso.

---

## 🎨 Secção 12 — Mood System & UI Dinâmica (Round 7) ✅

Nesta secção, implementámos o Mood System dinâmico que reage ao estado emocional do animal ativo. A interface do Pawra agora adapta as suas cores, mensagens e animações com base no humor do animal, mantendo um tom de confiança e calma (como um consultório de veterinário), sem ser alarmista.

### 1. Criação do MoodContext
* **Localização**: [MoodContext.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/contexts/MoodContext.tsx)
* **Estados**: Três estados emocionais suportados: `calm` | `neutral` | `concerned`.
* **Mapeamento de Emoções**:
  - `relaxed`, `excitement` ➔ `calm` (tons verdes/teal suaves, animações lentas)
  - `attention`, `alert` ➔ `neutral` (tons azuis/cinza neutros, animações normais)
  - `distress`, `hunger` ➔ `concerned` (tons âmbar/laranja quentes, animações ativas)
* **Persistência & Fallback**:
  - O mood é calculado sempre que há uma nova classificação.
  - Se a última classificação ocorreu há mais de **48 horas**, o humor reverte automaticamente para `neutral`.
  - O último humor é guardado no `localStorage` e aplicado de forma síncrona na inicialização no `document.documentElement` para evitar cintilação (flash) ao carregar.

### 2. Adaptação Dinâmica da UI (Dashboard)
* **Cores**: Definição de variáveis CSS HSL (`--mood-primary`, `--mood-bg-subtle`, `--mood-color-rgb`) para light e dark modes em [index.css](file:///C:/Users/Alexandre/Documents/Pawra/client/src/index.css), registadas como `--color-mood-primary` e `--color-mood-bg` no Tailwind CSS.
* **Mensagens Contextuais**:
  - `calm` ➔ `"O [Nome] está bem hoje 🐾"` (onde [Nome] é substituído pelo nome do animal ativo, ex: "O Rex está bem hoje 🐾")
  - `neutral` ➔ `"Sem novidades com o [Nome]"` (ex: "Sem novidades com o Rex")
  - `concerned` ➔ `"O [Nome] pode precisar de atenção — vê os detalhes"` (ex: "O Rex pode precisar de atenção — vê os detalhes")
* **Animações (Framer Motion)**:
  - **Pulsar do Avatar**: O avatar do animal ativo no cabeçalho do dashboard e na lista de animais pulsa suavemente com escalas e sombras (box-shadow glow) que variam de velocidade consoante o humor: 3.0s para `calm`, 2.0s para `neutral` e 1.2s para `concerned`.
  - **Cards de Estatísticas & Secções**: Entram com uma animação combinada de fade-in e slide-up progressiva e escalonada (staggered) usando variantes do Framer Motion ao abrir a página do Dashboard.
  - **Transições de Página**: Aplicado um crossfade suave de 200ms na transição entre rotas no [App.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/App.tsx).
  - **Botão de Gravação**: Mantém a animação de respiração (breathing animation) ativada durante a captação de áudio através do `GlowingButton`.

---

## 🎨 Secção 13 — Auditoria Completa de UI & UX (Round 8) ✅

Realizámos uma auditoria completa a todos os ecrãs e botões da aplicação para maximizar a consistência, usabilidade e responsividade em ecrãs estreitos de dispositivos móveis (375px), eliminando redundâncias e uniformizando comportamentos de navegação.

### O que foi corrigido:
1. **Gravar de Novo (`RecordingPage.tsx`)**: O botão de "Gravar de novo" no painel de revisão de gravação de áudio estava incorretamente configurado para chamar o handler `handleDelete` (que simplesmente regressava ao estado inicial sem começar a gravar). Atualizámos o botão para chamar `handleRetry`, iniciando o ciclo de gravação imediatamente.
2. **Navegação de Voltar do Header (`Header.tsx`)**: Atualizámos a navegação do botão de voltar para redirecionar explicitamente para o portal `/capturar` quando o utilizador se encontra no gravador de áudio (`/gravar`) ou na câmara (`/camera`), evitando retrocessos inesperados na pilha de histórico do browser.
3. **Consolidação de Termos e Privacidade (`SettingsPage.tsx`)**: A secção de "Documentos e Políticas" continha dois botões separados ("Privacidade" e "Termos de Uso") que redirecionavam para o mesmo destino (`/privacidade`). Consolidámos ambos num único botão elegante "Termos e Privacidade" de largura completa.
4. **Resolução de Emojis em jsPDF (`AnimalDetailPage.tsx`)**: Removemos os caracteres de emoji (`🐾`, `🐕`, `🐈`) das strings do gerador de PDF jsPDF, uma vez que fontes Helvetica padrão não os suportam e causavam caixas pretas ou falhas visuais nos relatórios clínicos exportados.
5. **Polimento de Emojis Restantes**:
   - **`DashboardPage.tsx`**: Substituição do emoji de boas-vindas `✨` pelo ícone `<Sparkles />` oficial da Lucide e remoção do emoji `🐾` do banner de estado diário do animal.
   - **`CameraPage.tsx`**: Remoção do emoji `📷` do botão de ativação da câmara e substituição do emoji de classificação na Badge de sucesso por um círculo dinâmico colorido estilizado nativo com base na cor de estado `STATE_COLORS` e tradução apropriada da emoção.
   - **`RecordingPage.tsx`**: Substituição do emoji no indicador do histórico da última classificação contínua por um círculo de estado de cor nativo.
   - **`HealthBulletinTab.tsx`**: Substituição do emoji `⚠️` na barra antirrábica DGAV por um ícone `<AlertCircle />` Lucide.
   - **`TrendCard.tsx`**: Substituição do emoji de padrão `✨` pelo ícone `<Sparkles />` Lucide.
   - **`ProfilePage.tsx`**: Simplificação dos botões de seleção de sexo (Masculino, Feminino, Desconhecido) para texto simples localizado (removendo `♂️`, `♀️` e `❓`) e eliminação do caractere de checkmark `✓` redundante que aparecia colado ao ícone `<Check />` da validação de nomes.

### O que foi removido e porquê:
* **Botão "Termos de Uso" individual (`SettingsPage.tsx`)**: Removido para evitar um link redundante com o mesmo destino que "Privacidade", uma vez que ambos apontavam para a mesma página `/privacidade`.
* **Câmara Emoji e Pata Decorativa**: Removidos elementos emoji redundantes da interface do utilizador, alinhando a aplicação com as decisões tomadas em rondas anteriores de abolir emojis literais a favor de SVG/Lucide de alta fidelidade e design premium.

### Verificação Técnica:
* **TypeScript Check**: `pnpm run check` correu sem qualquer erro.
* **Testes Unitários**: Suite de testes com 103/103 testes verdes.
* **Build de Produção**: `pnpm run build` compilou perfeitamente.

---

## 🛠️ Secção 14 — Migração para Biome ✅

Realizámos a migração completa do ecossistema de qualidade de código do Pawra de ESLint + Prettier para o Biome, unificando as tarefas de linting, formatação e ordenação automática de imports numa única ferramenta de alto desempenho.

### O que foi feito:
1. **Instalação e Inicialização**:
   * Instalámos a dependência `@biomejs/biome` (versão 2.5.0) e inicializámos a configuração com `pnpm biome init`.
2. **Configuração Customizada (`biome.json`)**:
   * Configuração de formatação idêntica ao Prettier anterior (indentação por espaços de tamanho 2, largura máxima de linha de 80, aspas duplas e ponto e vírgula obrigatório).
   * Ativação das regras recomendadas do linter e suporte para hooks do React (`useHookAtTopLevel` e `useExhaustiveDependencies`).
   * Configuração de ignores de diretórios usando a sintaxe de exclusão de força `!!` do Biome 2.5.0, excluindo pastas como `node_modules`, `dist`, `build`, `.gemini`, `client/public/__manus__` e `client/src/components/ui` (componentes do shadcn/ui).
   * Ativação da ordenação automática de imports sob a secção `assist.actions.source.organizeImports`.
3. **Resolução de Conflitos e Correções no Código**:
   * Executámos `pnpm biome check --write --unsafe .` para formatar todo o projeto e aplicar correções automáticas seguras de qualidade.
   * **`HistoryPage.tsx`**: O componente `_EventRow` foi renomeado para `EventRow` (removendo o underscore inicial). Isto permitiu que o Biome o identificasse corretamente como um componente React em vez de uma função comum, eliminando 8 falsos positivos da regra `useHookAtTopLevel` (uso de hooks fora de componentes).
   * **Vitest e React Scope (`ConfidenceRing.tsx`, `LiveAudioMeter.tsx` e respetivos testes)**: Como o Vitest executa no Node sem o runtime JSX automático ativado por defeito na configuração, a remoção automática do import do React originava erros `ReferenceError: React is not defined` ao correr os testes unitários de componentes UI. Reintroduzimos o import explícito do React com o comentário `// biome-ignore lint/correctness/noUnusedImports: React is needed for JSX in Vitest` para manter a integridade dos testes.
4. **Remoção de Tooling Antigo**:
   * Removemos a dependência do `prettier` do `package.json`. Como o projeto não continha dependências diretas de `eslint` declaradas, nenhuma outra remoção de pacotes foi necessária.
5. **Atualização de Scripts (`package.json`)**:
   * Substituímos a formatação antiga do Prettier pelos comandos do Biome:
     * `"lint": "biome check ."`
     * `"lint:fix": "biome check --write ."`
     * `"format": "biome format --write ."`
6. **Integração no CI/CD (`.github/workflows/ci.yml`)**:
   * Adicionámos um step de validação de código no fluxo de integração contínua antes do build:
     ```yaml
     - name: Lint & Format check
       run: pnpm biome ci .
     ```

### Verificação Técnica Final:
* **Biome CI**: O comando `pnpm biome ci .` foi executado e concluiu com 100% de sucesso (zero erros).
* **Testes Unitários**: Todos os 103 testes da aplicação estão verdes.
* **Build**: O build de produção (`pnpm run build`) compilou perfeitamente e gerou as pastas de distribuição client/server sem avisos.

---

## 🎨 Secção 15 — Autocomplete de Raças + Validação SIAC (Round 12) ✅

Nesta secção, implementámos o autocomplete de raças inteligente que consome as APIs públicas Dog API e Cat API, e adicionámos a validação de microchips no padrão português SIAC.

### 1. Autocomplete de Raças com Dog/Cat API
* **Componente Inteligente**: Criámos o componente `BreedAutocomplete` ([ProfilePage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/ProfilePage.tsx#L370-L485)) que substitui o seletor antigo:
  - Consome dinamicamente a Dog API (`https://api.thedogapi.com/v1/breeds/search?q=[termo]`) ou Cat API (`https://api.thecatapi.com/v1/breeds/search?q=[termo]`) consoante a espécie.
  - Se a espécie for indefinida ou não selecionada, pesquisa em ambas as APIs e junta os resultados.
  - Filtra e mostra no máximo 6 resultados num menu dropdown flutuante estilizado.
  - Implementa um debounce de **300ms** para controlar o volume de requisições.
  - Trata o tempo de resposta através de um timeout de **3 segundos** com `AbortController` (se a API falhar ou demorar muito tempo, o campo funciona como input de texto normal - Graceful Fallback).
* **Limpeza de Estados**: Removemos as variáveis obsoletas de carregamento prévio de raças e os seus respetivos `useEffect` e `localStorage` de `AddAnimalForm` e `EditAnimalForm`.

### 2. Validação SIAC (Microchip com 15 dígitos)
* **Validação em Tempo Real**: Adicionámos a validação de formato/tamanho para números de microchip nos formulários de criação (`AddAnimalForm`) e edição (`EditAnimalForm`):
  - Verifica se o número contém exatamente 15 dígitos numéricos.
  - Se for digitado um valor inválido, o botão "Guardar" fica desativado e exibe-se a mensagem `"O número de microchip deve ter exatamente 15 dígitos"`.
  - O campo de microchip na aba manual (ou edição) continua opcional, mas se for preenchido, é obrigatoriamente validado. Na aba microchip, a validação é estrita e obrigatória.

### 3. Verificação Técnica
* **TypeScript & Biome Check**: Concluído com 0 erros e 0 avisos em `ProfilePage.tsx`.
* **Testes Unitários**: Suite de testes completa com todos os **103/103 testes** a passar com sucesso.
* **Build de Produção**: O comando `pnpm run build` gerou o bundle de produção estático e do servidor sem qualquer problema.

## ⚖️ Secção 16 — Conformidade Legal RGPD (Round 13) ✅

Nesta ronda, implementámos um conjunto completo de medidas de conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD), incluindo uma nova página de Política de Privacidade, links e modais de consentimento nos ecrãs de registo e definições, e a funcionalidade de apagamento permanente de conta (com cascade delete no Supabase e remoção de áudios no Storage).

### 1. Página de Política de Privacidade Pública (/privacidade)
* **Componente**: Criámos o ficheiro [PrivacyPolicyPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/PrivacyPolicyPage.tsx) contendo as secções exigidas pelo RGPD (português):
  - **Identificação da App & Responsáveis**: Pawra e placeholders para o tutor preencher.
  - **Dados Recolhidos**: Nome, email, dados do animal, áudios, câmara e localização.
  - **Finalidades e Bases Jurídicas**: Prestação de serviço de tradução emocional de vocalizações baseada no consentimento explícito do utilizador (Artigo 6.º, n.º 1, alínea a) do RGPD).
  - **Alojamento e Segurança**: Dados guardados na região da UE (Frankfurt) através do Supabase com cifragem AES-256 em repouso e Row Level Security (RLS) ativo.
  - **Direitos do Tutor**: Acesso, retificação, eliminação ("direito ao esquecimento"), portabilidade e oposição.
  - **Retenção de Dados**: Eliminação imediata dos servidores após o apagamento da conta e remoção dos registos de autenticação em 30 dias.
* **Design**: Consistente com o tema dark e estética premium da app, com secções colapsáveis (`Accordion`) e rodapé com link de contacto. A rota foi adicionada publicamente em [App.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/App.tsx) de forma a não exigir autenticação prévia.

### 2. Consentimento e Políticas no Registo e Definições
* **Ecrã de Registo (`RegisterPage.tsx`)**: Adicionámos o texto explicativo abaixo do botão de submissão do formulário: *"Ao criar conta, aceitas os nossos Termos de Uso e a nossa Política de Privacidade."*
  - O link de Política de Privacidade redireciona para `/privacidade`.
  - O link de Termos de Uso abre um modal dialog moderno com a indicação *"Termos de Uso — Em breve"*.
* **Definições (`SettingsPage.tsx`)**:
  - Dividimos o botão anterior "Termos e Privacidade" em dois botões autónomos: um para consultar a "Política de Privacidade" e outro que abre o modal informativo "Termos de Uso — Em breve".

### 3. Apagamento Permanente de Conta ("Zona de Perigo")
* **Botão "Apagar Conta" (`SettingsPage.tsx`)**: Adicionámos uma nova secção visualmente sinalizada de "Zona de Perigo" (Danger Zone) com um botão vermelho que despoleta uma caixa de diálogo de confirmação.
* **Endpoint de Eliminação (`routers.ts`)**: Implementámos a mutation `deleteAccount` dentro do router `auth` que corre do lado do servidor:
  - Consulta e remove permanentemente todos os ficheiros de áudio do utilizador armazenados no bucket `audio-recordings` do Supabase Storage.
  - Invoca o endpoint administrativo do Supabase Auth (`supabase.auth.admin.deleteUser`) para remover o registo de autenticação do utilizador.
  - Elimina a linha do utilizador na tabela `public.users`, o que ativa automaticamente o apagamento em cascata (`ON DELETE CASCADE`) de todos os registos do utilizador e dos seus animais em todas as tabelas públicas do PostgreSQL no Supabase.
  - Limpa os cookies de sessão de login no response e redireciona o cliente para o ecrã `/login` exibindo um toast informativo.

### 4. Verificação Técnica
* **TypeScript & Biome Check**: TypeScript compilado com sucesso e lint do Biome executado sem erros.
* **Testes Unitários**: Criámos um novo teste em [auth.deleteAccount.test.ts](file:///C:/Users/Alexandre/Documents/Pawra/server/auth.deleteAccount.test.ts) que valida todo o fluxo de eliminação da conta (remoção de áudios, chamada ao Auth Admin do Supabase, remoção de BD e remoção de cookies). A suite completa correu e passou com sucesso (**104/104 testes**).

---

## 🌟 Ronda 14b: Rebranding para Pawra & Novo Ícone Profissional ✅

### 1. Novo Nome do Projeto
* **Pawra** foi o nome selecionado por representar idealmente a monitorização acústica e visual de animais de estimação, mantendo-se premium, fácil de pronunciar em Português e Inglês, e muito focado no valor do produto.

### 2. Configurações de Rebranding
* **package.json:** Nome atualizado para `"pawra"` com uma nova descrição descritiva.
* **capacitor.config.ts:** Alterado `appName` para `"Pawra"`.
* **strings.xml (Android):** Atualizado `app_name` e `title_activity_main` para `"Pawra"`.
* **client/index.html:** Atualizado o título principal para `"Pawra 🐾 - Compreenda o Seu Animal de Estimação"`, atualizadas as meta tags de Open Graph/Twitter, definido o `theme-color` como `#22c55e` (verde do tema) e adicionado o link para o ícone favicon `icon.svg`.
* **vite.config.ts (PWA Manifest):** Atualizadas as configurações do manifest do PWA (`name` e `short_name` para `"Pawra"`, descrição para *"Pawra: Monitorização inteligente do bem-estar animal"* e o `theme_color` ajustado).

### 3. Logótipos e Ícones Profissionais SVG
* **client/public/icon.svg:** Ícone completo com cantos arredondados, fundo gradiente e a pata central estilizada com ondas sonoras.
* **client/public/icon-foreground.svg:** Apenas a pata central com fundo transparente, otimizada para ícones adaptativos do Android.
* **client/public/icon-background.svg:** Apenas o fundo com gradiente radial completo para ícones adaptativos.
* **docs/icon-export.md:** Manual detalhado ensinando o programador a exportar os ficheiros SVG para o formato de loja PNG 512x512px.

### 4. Rebranding na Interface do Utilizador (UI) e Docs
* Alteradas todas as menções de marca de "AnimalMind" para "Pawra" nos ecrãs de **Landing Page**, **Autenticação (Login, Registo, Recuperação, Verificação de Email, Callback)**, **Dashboard**, **Histórico**, **Gravação/Captura**, **Câmara**, **Páginas de Privacidade** e **Definições**.
* Atualizado o domínio principal nas configurações internas de CORS da API e URL padrão do Capacitor para `pawra.vercel.app` (mantendo retrocompatibilidade no backend).
* Atualizada toda a documentação de suporte do projeto: `README.md`, `walkthrough.md`, `docs/API.md` e `docs/backlog.md`.

### 5. Verificação Técnica Total
* **Compilação TypeScript:** `pnpm run check` correu sem qualquer erro (0 erros).
* **Testes Unitários:** Todos os **104 testes unitários** do Vitest passaram com sucesso.
* **Build de Produção:** O comando `pnpm run build` gerou a build final sem falhas.
* **Git:** Commits registados com sucesso e alterações enviadas para a branch `main`.


