-- Script para crear las tablas de permisos granulares
-- Ejecute esto en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    categoria TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.permisos_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permiso_id UUID REFERENCES public.permisos(id) ON DELETE CASCADE,
    UNIQUE(rol_id, permiso_id)
);

-- Desactivar RLS momentáneamente para facilitar la configuración inicial
ALTER TABLE public.permisos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos_roles DISABLE ROW LEVEL SECURITY;
