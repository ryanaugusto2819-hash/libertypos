CREATE TABLE public.contas_uy (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_uy TO authenticated;
GRANT ALL ON public.contas_uy TO service_role;

ALTER TABLE public.contas_uy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contas_uy"
ON public.contas_uy FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert contas_uy"
ON public.contas_uy FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update contas_uy"
ON public.contas_uy FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete contas_uy"
ON public.contas_uy FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_contas_uy_updated_at
BEFORE UPDATE ON public.contas_uy
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.contas_uy (nome) VALUES ('Pablo'), ('Shirley')
ON CONFLICT (nome) DO NOTHING;