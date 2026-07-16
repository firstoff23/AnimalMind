# Guia de Integração e Setup (onboarding.md)

Bem-vindo ao projeto **Pawra**! Este documento orienta novos programadores e agentes de IA na configuração do ambiente de desenvolvimento local e execução das rotinas de teste e compilação.

---

## 📋 Pré-requisitos do Sistema

Antes de iniciar, certifique-se de que possui as seguintes ferramentas instaladas:

1. **Node.js:** Versão LTS compatível (recomendado >= 18.x ou superior).
2. **PNPM:** Gestor de pacotes principal do projeto (instalável globalmente via `npm i -g pnpm`).
3. **Python 3.11:** Necessário para o backend de processamento de áudio/ML.
4. **FFmpeg:** Obrigatório no PATH do sistema caso queira correr o backend FastAPI nativamente (utilizado para conversão e processamento de áudio).

---

## ⚙️ Configuração do Ambiente Local

1. **Instalar Dependências:**
   No diretório raiz do projeto, instale todos os pacotes Node.js e dependências das workspaces:
   ```bash
   pnpm install
   ```

2. **Configurar Variáveis de Ambiente:**
   Crie um ficheiro chamado `.env.local` na raiz do projeto (nunca comita chaves ou segredos reais para o repositório).
   Use a estrutura padrão abaixo:
   ```env
   # Configurações do Supabase para o Gateway
   SUPABASE_URL="https://yuzqxrmtbqlnalpjehno.supabase.co"
   SUPABASE_ANON_KEY="sua-anon-key-aqui"
   SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-aqui"

   # Configurações do Frontend (Vite)
   VITE_SUPABASE_URL="https://yuzqxrmtbqlnalpjehno.supabase.co"
   VITE_SUPABASE_ANON_KEY="sua-anon-key-aqui"

   # URL do Backend de Processamento Acústico
   FASTAPI_BACKEND_URL="http://localhost:8000"

   # Chave Secreta para Sessões JWT locais
   JWT_SECRET="um-segredo-de-seguranca-local-gerado-por-si"
   ```

3. **Configurar o Backend de Machine Learning (Python):**
   Abra um terminal na pasta `ml_backend/`, crie e ative um ambiente virtual Python, e instale os pacotes necessários:
   ```bash
   cd ml_backend
   python -m venv .venv
   
   # Windows (PowerShell)
   .venv\Scripts\Activate.ps1
   
   # Linux/macOS
   source .venv/bin/activate
   
   pip install -r requirements.txt
   ```

---

## 🚀 Execução do Projeto

Para colocar o projeto a correr localmente em modo de desenvolvimento:

1. **Executar o Backend de ML (FastAPI):**
   Com o ambiente virtual ativado na pasta `ml_backend/`:
   ```bash
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Executar o Gateway e Frontend (React):**
   Num outro terminal na raiz do projeto:
   ```bash
   pnpm run dev
   ```
   A aplicação React estará acessível por padrão em `http://localhost:5173` e as requisições de tRPC serão processadas em `http://localhost:3100`.

---

## 🧪 Comandos Utilitários de Validação

Use estes comandos com frequência para garantir a integridade do código antes de submeter alterações:

* **Verificação de Tipos (TypeScript):**
  ```bash
  pnpm run check
  ```
* **Executar Testes Unitários:**
  ```bash
  pnpm test
  ```
* **Análise de Linting (Biome):**
  ```bash
  pnpm run lint
  ```
* **Compilação de Produção (Build):**
  ```bash
  pnpm run build
  ```
* **Testes de Integração E2E (Playwright):**
  ```bash
  pnpm run e2e
  ```
