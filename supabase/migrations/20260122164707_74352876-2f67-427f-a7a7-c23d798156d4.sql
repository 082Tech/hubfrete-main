-- Make the notas-fiscais bucket public so vehicle photos can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'notas-fiscais';