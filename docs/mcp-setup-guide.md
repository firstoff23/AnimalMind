# Configuração do MCP (Model Context Protocol)

O Model Context Protocol (MCP) permite que os seus agentes interajam nativamente com serviços externos (como o GitHub e o Playwright) de forma padronizada.

Para configurar o MCP localmente no seu projeto (suportado por clientes compatíveis como a extensão oficial do Copilot com MCP ativo, Cline, Roo Code, ou Cursor), siga estes passos:

## 1. Criar o ficheiro de configuração MCP
A maioria das extensões em VS Code lê a configuração de MCP num ficheiro específico ou através do `settings.json`. Aqui vamos preparar o formato standard em JSON.

Criei ou cole este bloco JSON. Se estiver a usar o VS Code com extensões como o Cline/Claude Dev, este bloco deve ir para o ficheiro correspondente (ex: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<COLOQUE_AQUI_O_SEU_TOKEN_GITHUB>"
      }
    },
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-playwright"
      ]
    }
  }
}
```

### Se preferir adicionar diretamente às definições do Workspace do VS Code (`.vscode/settings.json`):
Adicione esta chave ao seu `settings.json` (se a sua versão do Copilot/Agente suportar a leitura direta a partir das configurações do workspace):

```json
  "github.copilot.mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<COLOQUE_AQUI_O_SEU_TOKEN>"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
```

## 2. Gerar o Token do GitHub
Para que o agente `Arquiteto` possa ler issues, fazer PRs e pesquisar repositórios:
1. Vá a [GitHub Developer Settings](https://github.com/settings/tokens).
2. Clique em **Generate new token (classic)** ou **Fine-grained token**.
3. Se for clássico, ative os scopes `repo`.
4. Copie o token gerado (começa por `ghp_...`).
5. Substitua `<COLOQUE_AQUI_O_SEU_TOKEN>` pela sua chave na configuração acima.

## 3. Instalar o Playwright (Opcional, mas Recomendado para o Tester)
Para que o servidor Playwright MCP funcione corretamente e o seu agente `Tester` consiga validar interfaces:
```bash
npm install -D playwright
npx playwright install
```

## 4. Reiniciar o Editor
Após atualizar a configuração e guardar o Token, feche e volte a abrir o seu editor. Os agentes (Arquiteto, Implementador, Revisor e Tester) terão agora a capacidade de sugerir a criação de repositórios, ler PRs, verificar issues e executar scripts do Playwright nativamente através de tool-calls.

> **Precisa que eu atualize o ficheiro `.vscode/settings.json` automaticamente por si?**
> Se preferir, basta dizer *"adiciona isso ao settings.json"* e tratarei de injetar as definições no seu ficheiro localmente, deixando apenas o espaço para colar o token depois!
