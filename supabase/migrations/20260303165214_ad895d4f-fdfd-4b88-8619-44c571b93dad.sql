
CREATE TABLE public.saques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_solicitacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_pagamento TIMESTAMP WITH TIME ZONE,
  comprovante_url TEXT,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saques" ON public.saques FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own saques" ON public.saques FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all saques" ON public.saques FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update any saque" ON public.saques FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any saque" ON public.saques FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_saques_updated_at
BEFORE UPDATE ON public.saques
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
