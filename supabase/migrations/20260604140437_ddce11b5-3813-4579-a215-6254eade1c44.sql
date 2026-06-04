DELETE FROM public.pedidos p
USING public.pedidos q
WHERE p.pais = 'BR'
  AND q.pais = 'BR'
  AND p.telefone = q.telefone
  AND p.telefone <> ''
  AND p.nome = q.nome
  AND p.data_entrada = q.data_entrada
  AND p.created_at > q.created_at;