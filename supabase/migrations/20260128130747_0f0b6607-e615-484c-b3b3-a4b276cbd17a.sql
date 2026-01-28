-- Atualizar senha dos usuários para 123456
UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email IN ('yuri.silva@esmalglass-itaca.com', 'adryele.nascimento@altadiagroup.com');