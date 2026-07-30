-- Migration para criar tabela de audit_logs (registo de login, logout e eliminações)

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS (mesmo que seja só para uso interno de backend)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Notificar o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
