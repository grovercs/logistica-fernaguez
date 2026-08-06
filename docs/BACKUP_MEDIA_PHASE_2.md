# Fase 2: copias con medios

La Fase 1 exporta exclusivamente datos operativos y de configuración permitidos. No descarga ni empaqueta fotografías, firmas o documentos. Esta decisión evita que una Function síncrona exceda sus límites de tiempo, memoria o respuesta.

## Arquitectura prevista

1. Un Administrador solicita la copia desde el Centro de copias de seguridad.
2. Un trabajo persistente, creado en servidor, toma un bloqueo global y registra estado, progreso, errores y el solicitante.
3. El trabajo exporta los datos y los medios por lotes, organizados como `media/OB-<id_legible>/reportes/<reporte_id>/`.
4. El resultado se guarda temporalmente en un bucket privado dedicado a copias. No se publica mediante políticas públicas.
5. Al finalizar, el servidor calcula el checksum SHA-256 del ZIP final y lo guarda fuera del ZIP junto con el manifiesto de la ejecución.
6. El Administrador obtiene una URL firmada de duración corta. La descarga nunca usa una URL pública permanente.

## Seguridad de medios remotos

Las descargas deberán ejecutarse sólo en servidor con una allowlist exacta de hosts de Cloudinary y del proyecto Supabase aprobado. Deben rechazarse localhost, rangos IP privados, direcciones de metadatos cloud, protocolos no HTTP(S) y redirecciones hacia hosts no permitidos. Cada descarga tendrá límite de tiempo, tamaño, tipo MIME y tamaño total acumulado; los fallos se registrarán por recurso sin exponer secretos.

## Ejecución y recuperación

El estado y el progreso deben persistir para permitir reintentos controlados, informar de fallos parciales y evitar dos copias concurrentes. Los archivos temporales y las copias expiradas se eliminarán mediante una retención programada y auditada. No se debe prometer reanudación automática hasta disponer de un modelo de lotes idempotente y probado.

## Restauración

Antes de habilitar una restauración se deberá probar en un entorno separado: integridad de manifest, checksum final externo, estructura por obra, restauración de datos y asociación de medios. Nunca se restaurará directamente sobre producción sin una copia previa, confirmaciones reforzadas y auditoría.
