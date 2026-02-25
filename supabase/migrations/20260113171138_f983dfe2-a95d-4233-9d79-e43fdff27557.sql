-- Vincular o auth_user_id ao usuário existente
UPDATE public.usuarios 
SET auth_user_id = '69983f0a-44c6-43ea-87e2-4d1d9627c974'
WHERE email = 'vitorvzp722@gmail.com' AND auth_user_id IS NULL;