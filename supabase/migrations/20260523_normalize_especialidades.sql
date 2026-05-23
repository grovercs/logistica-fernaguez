-- Normalizar especialidades existentes en trabajadores para que coincidan
-- con los nombres de la tabla especialidades (minúsculas con tilde)
UPDATE public.trabajadores
SET especialidad = CASE especialidad
  WHEN 'fontaneria' THEN 'fontanería'
  WHEN 'electricidad' THEN 'electricidad'
  WHEN 'albanileria' THEN 'albañilería'
  WHEN 'pintura' THEN 'pintura'
  WHEN 'carpinteria' THEN 'carpintería'
  WHEN 'climatizacion' THEN 'climatización'
  ELSE especialidad
END
WHERE especialidad IN ('fontaneria', 'electricidad', 'albanileria', 'pintura', 'carpinteria', 'climatizacion');
