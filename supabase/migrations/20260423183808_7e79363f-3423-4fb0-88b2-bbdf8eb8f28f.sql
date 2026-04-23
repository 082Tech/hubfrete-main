CREATE POLICY "Embarcadores veem tracking de cargas próprias"
ON public.tracking_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    JOIN cargas c ON c.id = e.carga_id
    WHERE ve.viagem_id = tracking_historico.viagem_id
      AND user_belongs_to_empresa(auth.uid(), c.empresa_id)
  )
);