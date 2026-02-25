
-- Fix functions with mutable search_path
-- These need search_path set to prevent search path injection attacks

-- 1. Fix update_updated_at_column function (trigger function)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Fix generate_chamado_codigo function - it's a TRIGGER function, not a regular function
CREATE OR REPLACE FUNCTION public.generate_chamado_codigo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.codigo := 'CH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN NEW;
END;
$$;

-- 3. Drop the dangerous insert_user_to_auth function
-- This function bypasses auth.users security and should not exist
DROP FUNCTION IF EXISTS public.insert_user_to_auth(text, text);

-- 4. Fix accept_carga_tx function - must drop first due to return type
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, numeric);

CREATE FUNCTION public.accept_carga_tx(
  p_motorista_id uuid,
  p_carga_id uuid,
  p_veiculo_id uuid,
  p_carroceria_id uuid,
  p_peso_kg numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carga RECORD;
  v_veiculo RECORD;
  v_peso_disponivel NUMERIC;
  v_peso_restante NUMERIC;
  v_entrega RECORD;
BEGIN
  IF p_peso_kg IS NULL OR p_peso_kg <= 0 THEN
    RAISE EXCEPTION 'peso_kg_invalido';
  END IF;

  -- Lock veículo e valida propriedade/capacidade.
  SELECT id, motorista_id, capacidade_kg
    INTO v_veiculo
    FROM veiculos
   WHERE id = p_veiculo_id
   FOR UPDATE;

  IF v_veiculo.id IS NULL THEN
    RAISE EXCEPTION 'veiculo_nao_encontrado';
  END IF;
  IF v_veiculo.motorista_id IS DISTINCT FROM p_motorista_id THEN
    RAISE EXCEPTION 'veiculo_nao_pertence_ao_motorista';
  END IF;
  IF v_veiculo.capacidade_kg IS NULL THEN
    RAISE EXCEPTION 'veiculo_sem_capacidade_kg';
  END IF;
  IF p_peso_kg > v_veiculo.capacidade_kg THEN
    RAISE EXCEPTION 'peso_maior_que_capacidade_veiculo';
  END IF;

  -- Lock carga e valida disponibilidade/status.
  SELECT id, codigo, status, peso_kg, peso_disponivel_kg, permite_fracionado
    INTO v_carga
    FROM cargas
   WHERE id = p_carga_id
   FOR UPDATE;

  IF v_carga.id IS NULL THEN
    RAISE EXCEPTION 'carga_nao_encontrada';
  END IF;

  IF NOT (v_carga.status IN ('publicada', 'parcialmente_alocada')) THEN
    RAISE EXCEPTION 'carga_indisponivel';
  END IF;

  IF v_carga.permite_fracionado = false AND p_peso_kg <> v_carga.peso_kg THEN
    RAISE EXCEPTION 'carga_nao_fracionada';
  END IF;

  v_peso_disponivel := COALESCE(v_carga.peso_disponivel_kg, v_carga.peso_kg);
  IF p_peso_kg > v_peso_disponivel THEN
    RAISE EXCEPTION 'peso_maior_que_disponivel_carga';
  END IF;

  -- Debita capacidade do veículo.
  UPDATE veiculos
     SET capacidade_kg = capacidade_kg - p_peso_kg,
         updated_at = now()
   WHERE id = p_veiculo_id;

  -- Cria entrega.
  INSERT INTO entregas (
    carga_id,
    motorista_id,
    veiculo_id,
    carroceria_id,
    status,
    peso_alocado_kg,
    codigo,
    created_at,
    updated_at
  ) VALUES (
    p_carga_id,
    p_motorista_id,
    p_veiculo_id,
    p_carroceria_id,
    'aguardando',
    p_peso_kg,
    v_carga.codigo,
    now(),
    now()
  ) RETURNING * INTO v_entrega;

  -- Debita peso disponível da carga e ajusta status.
  v_peso_restante := v_peso_disponivel - p_peso_kg;

  UPDATE cargas
     SET peso_disponivel_kg = v_peso_restante,
         status = CASE WHEN v_peso_restante <= 0 THEN 'totalmente_alocada' ELSE 'parcialmente_alocada' END,
         updated_at = now()
   WHERE id = p_carga_id;

  RETURN to_jsonb(v_entrega);
END;
$$;

-- 5. CRITICAL: Fix user_roles RLS policy - this is a privilege escalation vulnerability
-- Users should not be able to modify their own roles

-- First drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.user_roles;

-- Create proper restrictive policies for user_roles
-- Users can only read their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Only admins can view all roles (using the existing has_role function)
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only system/service role can insert/update/delete roles (no authenticated user policy)
-- This means roles can only be managed via edge functions with service role

-- 6. Fix locations RLS - users should only update their own location
DROP POLICY IF EXISTS "Users can update their own location" ON public.locations;
DROP POLICY IF EXISTS "Users can insert their own location" ON public.locations;

-- Create helper function to get motorista_id for current user
CREATE OR REPLACE FUNCTION public.get_user_motorista_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM motoristas WHERE user_id = p_user_id LIMIT 1;
$$;

-- Users can only insert/update locations for their motorista record
CREATE POLICY "Users can insert their own location" 
ON public.locations 
FOR INSERT 
TO authenticated
WITH CHECK (motorista_id = public.get_user_motorista_id(auth.uid()));

CREATE POLICY "Users can update their own location" 
ON public.locations 
FOR UPDATE 
TO authenticated
USING (motorista_id = public.get_user_motorista_id(auth.uid()))
WITH CHECK (motorista_id = public.get_user_motorista_id(auth.uid()));
