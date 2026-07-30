-- Migration para adicionar índices de performance na tabela classification_events

-- Índice para acelerar a ordenação e filtragem por data de criação
CREATE INDEX IF NOT EXISTS idx_classifications_created_at ON classification_events(created_at);

-- Índice para acelerar a filtragem por estado (state)
CREATE INDEX IF NOT EXISTS idx_classifications_state ON classification_events(state);

-- Notificar o PostgREST para recarregar o schema (Regra R1 de AGENTS.md recomenda isto quando o schema é alterado, embora índices não afetem a API, é seguro)
NOTIFY pgrst, 'reload schema';
