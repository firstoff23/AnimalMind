-- Adicionar coluna fcm_token à tabela de utilizadores para suportar Notificações Push

ALTER TABLE public.users
ADD COLUMN fcm_token TEXT;

-- Permitir que utilizadores atualizem o seu próprio fcm_token
-- Se já houver uma política de UPDATE na tabela users para o dono, ela cobrirá isto, mas para garantia:
CREATE POLICY "Users can update their own fcm_token"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

NOTIFY pgrst, 'reload schema';
