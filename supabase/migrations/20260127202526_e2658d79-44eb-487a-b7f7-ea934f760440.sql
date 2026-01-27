-- Inserir vitorvzp como super_admin na torre_users
INSERT INTO public.torre_users (user_id, email, nome, role, ativo)
VALUES ('69983f0a-44c6-43ea-87e2-4d1d9627c974', 'vitorvzp722@gmail.com', 'Vitor VZP', 'super_admin', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', ativo = true;