ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS status_cobranca text NOT NULL DEFAULT 'pendente';

UPDATE public.pedidos
SET status_cobranca = 'pendente'
WHERE status_cobranca IS NULL;