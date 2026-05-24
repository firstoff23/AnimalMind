# AnimalMind 🐾

O **AnimalMind** é uma aplicação web premium e interativa desenvolvida para monitorizar e traduzir o estado emocional de animais de estimação (cães e gatos) a partir de sinais sonoros e acústicos. A aplicação utiliza modelos avançados de IA para classificar vocalizações animais e oferece um painel estatístico em tempo real para os tutores.

---

## 🌟 Funcionalidades Principais

### 1. Gravação & Streaming de Áudio em Tempo Real
* **Waveform e Medidor Live:** Captura de áudio nativa através do microfone (Web Audio API) com feedback visual contínuo do nível sonoro e ondas sonoras em tempo real ([LiveAudioMeter.tsx](file:///client/src/components/LiveAudioMeter.tsx)).
* **Feedback de Contagem:** Gravação de precisão de 3 segundos com contagem decrescente visual interactiva.

### 2. Auto Classify (Modo Automático — Estilo Shazam)
* **Ativação por Gesto:** Mantenha premido o botão central de gravação (Long Press > 700ms) para ativar o modo automático.
* **Interface Vibrante:** O botão central entra num estado luminoso dinâmico (`auto-pulse` ciano/azul) e o painel indica que o piloto automático está ativo.
* **Escuta Contínua:** Grava em loops consecutivos de 3 segundos, analisa em background, atualiza as estatísticas e recomeça imediatamente de forma autónoma.
* **Banner de Alternância:** Um banner premium de controlo rápido sob o botão permite alternar o "Modo Contínuo" com um único toque.

### 3. Dashboard Dinâmico
* **Estatísticas Semanais:** Distribuição visual dos estados emocionais identificados (ex: excitação, sofrimento, fome, alerta, relaxado) nos últimos 7 dias.
* **Estado Dominante:** Exibe o estado emocional mais representativo do dia atual com cores e emojis dinâmicos.
* **Evolução da Confiança:** Gráfico de linha interativo exibindo a média de confiança diária das classificações acústicas.

### 4. Histórico Interativo
* **Swipe to Classify (Framer Motion):** Deslize cada linha do histórico para a esquerda (Incorreto) ou para a direita (Correto) para calibrar a inteligência do sistema. Gestos de arrastamento fluidos, acelerados por hardware e com retorno automático em mola ([HistoryPage.tsx](file:///client/src/pages/HistoryPage.tsx)).
* **Long Press para Dados Brutos:** Mantenha pressionada uma linha do histórico por 550ms para abrir um diálogo técnico exibindo o JSON dos metadados gerados pelo modelo de classificação e IA.

---

## 🛠️ Stack Tecnológica

* **Frontend:** React 19, TypeScript, Tailwind CSS, Shadcn/UI, Wouter (Routing), Framer Motion, Recharts
* **Backend:** Node.js, Express, tRPC (v11) para comunicação tipo-segura (End-to-End Type Safety)
* **Base de Dados & Auth:** Supabase (Autenticação robusta com verificação de email, sessões, perfil de utilizador e base de dados baseada em PostgreSQL com lazy-initialization)
* **Testes:** Vitest (Suite completa cobrindo integração do Supabase, lógica de negócios, componentes visuais e helpers de gestos)

---

## 🚀 Como Executar Localmente

### 1. Instalar Dependências
```bash
pnpm install
```

### 2. Variáveis de Ambiente
Crie um ficheiro `.env.local` e `.env.production.local` na pasta raiz com as chaves do Supabase:
```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-anon-key"
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
```

### 3. Executar o Servidor de Desenvolvimento
```bash
pnpm run dev
```
O frontend estará acessível em `http://localhost:5173`.

### 4. Correr Testes Unitários e de Integração
```bash
pnpm run test
```

### 5. Validar Tipagem do TypeScript
```bash
pnpm run check
```

### 6. Compilar para Produção (Build)
```bash
pnpm run build
```

---

## 📈 Histórico de Atualizações (Progress Log)

* **Commit 641581f9:** Adiciona o modo *Auto Classify* (Modo Automático contínuo estilo Shazam) na gravação de áudio com Long-press e banner de alternância em [RecordingPage.tsx](file:///client/src/pages/RecordingPage.tsx).
* **Commit 3e5e5798:** Migra o gesto do *Swipe to Classify* no histórico ([HistoryPage.tsx](file:///client/src/pages/HistoryPage.tsx)) para `framer-motion` com física de arrastamento e mola de alta fidelidade e aceleração por GPU.
* **Commit feeb5d5d:** Corrige os tipos do cliente Supabase para impedir a inferência de `never` nas tabelas no TypeScript e resolve conflitos de tipagem de parâmetros.
* **Commit 76298a03:** Integração e merge final das funcionalidades de Live Audio Streaming, Swipe de Feedback e Long Press no histórico.
