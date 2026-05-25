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

### 5. Voice-to-Text para Notas de Observação
* **Ditado por voz nativo:** Microfone ao lado do campo de texto com efeito pulsante azul-ciano para ditar notas de observação em Português de Portugal (`pt-PT`) usando a Web Speech API.
* **Persistência e Integração:** Notas guardadas localmente em `server/notes.json` e acopladas às consultas de eventos via tRPC. Exibidas no histórico com um indicador 📝 e no detalhe do diálogo de dados brutos.

### 6. Gravação de Áudio Real e Supabase Storage
* **Gravação Física:** Captura o som real do animal de estimação em formato comprimido (ex: `audio/webm`, `audio/mp4`) durante os 3 segundos de monitorização física do microfone via `MediaRecorder`.
* **Upload automático:** O ficheiro é enviado diretamente para o Supabase Storage público no bucket `audio-recordings` e o URL público é persistido em `classification_events.audio_url`.
* **Reprodutor Integrado:** Se um evento do Histórico possui áudio real, é exibido um botão circular de Play/Pause para ouvir o som diretamente na linha de registo ou um reprodutor nativo completo no diálogo de Dados Brutos.

### 7. Backend de Classificação Acústica Real (FastAPI)
* **API Dedicada:** Servidor Python FastAPI autónomo localizado na pasta `ml_backend/` que disponibiliza a rota `/classify`.
* **Modelo YAMNet Real:** Realiza conversão de áudio multi-formato (usando FFmpeg global) para WAV 16kHz mono, carrega o modelo oficial `https://tfhub.dev/google/yamnet/1` via TensorFlow Hub e usa as classes AudioSet inferidas para orientar a classificação.
* **Mapeamento Emocional:** Mapeia as classes acústicas do YAMNet e sinais físicos auxiliares para os 6 estados emocionais da aplicação.
* **Fallback Interno:** Se TensorFlow/YAMNet não estiver disponível no servidor Python, o backend cai para análise `numpy`/`scipy` com RMS, Zero Crossing Rate e frequência dominante.
* **Resiliência & Fallback:** Se a variável de ambiente `FASTAPI_BACKEND_URL` não estiver definida ou o servidor FastAPI estiver offline, a API tRPC do Node.js cai de forma transparente e resiliente para o simulador heurístico sem afetar a usabilidade da aplicação.

### 8. Página de Detalhe por Animal
* **Painel Dedicado (`/animal/:id`):** Acessível a partir da página de Perfil, reúne todas as informações históricas e estatísticas de um único animal de estimação.
* **Evolução Temporal:** Gráfico interativo com a média diária de confiança de classificação nos últimos 7 ou 30 dias para análise de progresso.
* **Radar Emocional Individual:** Visualização tridimensional da distribuição de estados emocionais específica do animal.

### 9. Exportação de Relatórios Clínicos (PDF)
* **Geração em Client-Side:** Botão "Descarregar PDF" integrado via `jspdf` para compilar e guardar um PDF clínico e comportamental detalhado do animal.
* **Estrutura Profissional:** Contém identificação do animal, parâmetros de baseline calibrados, sumário estatístico de atividade e tabela com o histórico das últimas 10 vocalizações com notas e metadados. Pronto para partilhar com médicos veterinários.

### 10. Baseline Comportamental & Alertas de Ruído
* **Calibração Dinâmica:** Interface intuitiva para definir o limiar diário de vocalizações normais, sensibilidade de alertas do microfone e marcar quais os estados emocionais são típicos do animal. A configuração mantém fallback local em `server/baselines.json`.
* **Perfil Médio por Animal:** Calcula a distribuição dos estados emocionais das últimas 4 semanas e persiste em `animals.baseline_data` (`JSONB`) para formar um perfil comportamental individual.
* **Fuga de Baseline:** Alertas visuais rápidos e banners caso o animal vocalize estados não-típicos, estados raros face ao seu perfil histórico, ou ultrapasse o limite diário de vocalizações estabelecido na baseline.

### 11. Multi-utilizador / Modo Família (Co-tutoria)
* **Partilha de Animais:** Convidar outros tutores através do e-mail com permissões de Leitura (apenas visualizar estatísticas e histórico) ou Escrita (efetuar gravações e alterar a baseline).
* **Gestão de Acessos:** O proprietário tem total controlo sobre quem tem acesso ao animal, podendo revogar partilhas a qualquer momento na tab "Co-tutores" da página de detalhe.
* **Convites no Dashboard:** Convites pendentes são notificados com um banner de convite premium com ações de Aceitar/Recusar. Animais partilhados são marcados com o badge `Co-tutor` no dashboard.

---

## 🛠️ Stack Tecnológica

* **Frontend:** React 19, TypeScript, Tailwind CSS, Shadcn/UI, Wouter (Routing), Framer Motion, Recharts
* **Node.js Gateway:** Node.js, Express, tRPC (v11) para comunicação tipo-segura (End-to-End Type Safety)
* **FastAPI Backend:** Python 3, FastAPI, Uvicorn, TensorFlow Hub/YAMNet, NumPy, SciPy, Soundfile, FFmpeg para análise acústica e processamento de sinal em tempo real
* **Bibliotecas Adicionais:** jsPDF para geração de relatórios de saúde PDF no cliente
* **Base de Dados & Auth:** Supabase (Autenticação robusta com verificação de email, sessões, perfil de utilizador e base de dados baseada em PostgreSQL com lazy-initialization)
* **Testes:** Vitest (Suite completa cobrindo integração do Supabase, lógica de negócios, componentes visuais e helpers de gestos)

---

## 🚀 Como Executar Localmente

### 1. Instalar Dependências do Gateway Node.js
```bash
pnpm install
```

### 2. Configurar o Backend FastAPI (Python)
Recomenda-se o uso de um ambiente virtual para instalar os requisitos de processamento de áudio:
```bash
cd ml_backend
python -m venv .venv
.venv\Scripts\activate  # No Windows
# source .venv/bin/activate  # No macOS/Linux
pip install -r requirements.txt
```

Executar o servidor FastAPI localmente na porta 8000:
```bash
uvicorn app:app --reload --port 8000
```

### 3. Variáveis de Ambiente
Crie um ficheiro `.env.local` e `.env.production.local` na pasta raiz do projeto. Adicione as chaves do Supabase e o URL do FastAPI:
```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-anon-key"
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
FASTAPI_BACKEND_URL="http://localhost:8000"
```

### 4. Executar o Servidor de Desenvolvimento Node.js
Retorne à raiz do projeto e execute:
```bash
pnpm run dev
```
O frontend estará acessível em `http://localhost:5173`.

### 5. Correr Testes Unitários e de Integração
```bash
pnpm run test
```

### 6. Validar Tipagem do TypeScript
```bash
pnpm run check
```

### 7. Compilar para Produção (Build)
```bash
pnpm run build
```

---

## 📈 Histórico de Atualizações (Progress Log)

* **Commit 1db40899:** Adiciona a página de detalhe por animal (`/animal/:id`), calibração dinâmica de baseline comportamental com persistência em `baselines.json`, gráficos avançados de análise, testes automatizados e exportação de relatórios em PDF via `jspdf`.
* **Commit 0f066285:** Integra o backend FastAPI para classificação acústica real e processamento de sinal em Python, com testes de fallback e documentação atualizada no roadmap.
* **Commit a07e75df:** Adiciona a gravação física de áudio de 3 segundos, upload automático para o Supabase Storage e botão de Play/Pause interativo na página do Histórico e Dados Brutos.
* **Commit 5bdec92d:** Adiciona o ficheiro `roadmap.md` na raiz para o rastreamento das metas de desenvolvimento e prioridades futuras do projeto.
* **Commit b98868a9:** Atualiza o README.md com a documentação do Voice-to-Text.
* **Commit ad82e941:** Adiciona a funcionalidade de *Voice-to-Text* (Ditado por voz) para Notas de Observação com persistência local em `notes.json` e integração no fluxo de gravação e histórico.
* **Commit 832f0e79:** Migra o gesto do *Swipe to Classify* no histórico ([HistoryPage.tsx](file:///client/src/pages/HistoryPage.tsx)) para `framer-motion` com física de arrastamento e mola de alta fidelidade e aceleração por GPU. Cria o README.md personalizado.
* **Commit 641581f9:** Adiciona o modo *Auto Classify* (Modo Automático contínuo estilo Shazam) na gravação de áudio com Long-press e banner de alternância em [RecordingPage.tsx](file:///client/src/pages/RecordingPage.tsx).
* **Commit feeb5d5d:** Corrige os tipos do cliente Supabase para impedir a inferência de `never` nas tabelas no TypeScript e resolve conflitos de tipagem de parâmetros.
* **Commit 37e2f4eb:** Implementa o Modo Família multi-utilizador, permitindo a co-tutoria de animais através de convites de e-mail e permissões diferenciadas (Leitura/Escrita) persistidas em `family_shares.json` sem DDL.
* **Commit fbdcddda:** Implementa a contextualização temporal POMDP (Belief State), deteção visual de postura (com overlay dinâmico simulado sobre WebRTC) e Modo Veterinário para diagnóstico clínico.
* **Commit 76298a03:** Integração e merge final das funcionalidades de Live Audio Streaming, Swipe de Feedback e Long Press no histórico.
