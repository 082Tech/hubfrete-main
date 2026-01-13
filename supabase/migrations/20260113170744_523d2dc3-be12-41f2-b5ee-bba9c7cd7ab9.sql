-- Remover vínculos com filiais
DELETE FROM public.usuarios_filiais 
WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE email = 'vitorvzp722@gmail.com');

-- Remover convites pendentes
DELETE FROM public.company_invites WHERE email = 'vitorvzp722@gmail.com';

-- Remover usuário
DELETE FROM public.usuarios WHERE email = 'vitorvzp722@gmail.com';

-- Recriar usuário
INSERT INTO public.usuarios (email, nome, cargo, motorista_autonomo)
VALUES ('vitorvzp722@gmail.com', 'Vitor', 'OPERADOR', false);

-- Vincular à filial matriz da Carajás (empresa_id = 2)
INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
SELECT u.id, f.id, 'OPERADOR'::usuario_cargo
FROM public.usuarios u
CROSS JOIN public.filiais f
WHERE u.email = 'vitorvzp722@gmail.com'
  AND f.empresa_id = 2
  AND f.is_matriz = true;