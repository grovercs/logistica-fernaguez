-- Nombre operativo de la obra, independiente del cliente/empresa y de la dirección.
-- Se mantiene nullable para conservar la compatibilidad con órdenes históricas.
ALTER TABLE public.ordenes
  ADD COLUMN IF NOT EXISTS nombre_obra text NULL;

COMMENT ON COLUMN public.ordenes.nombre_obra IS
  'Nombre operativo de la obra. Se muestra con preferencia al cliente en las interfaces de operación.';
