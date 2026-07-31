BEGIN;
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(p_actor_user_id uuid,p_target_user_id uuid,p_nombre_completo text,p_rol_id uuid,p_activo boolean,p_trabajador_id uuid,p_confirm_active_assignments boolean DEFAULT false)
RETURNS TABLE (rol_id uuid, activo boolean, trabajador_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old_role text; v_old_active boolean; v_old_name text; v_old_worker uuid; v_new_role text; v_worker_owner uuid; v_active integer := 0;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.perfiles p JOIN public.roles r ON r.id=p.rol_id WHERE p.id=p_actor_user_id AND p.activo IS TRUE AND r.nombre='Administrador') THEN RAISE EXCEPTION 'ADMIN_FORBIDDEN'; END IF;
 IF p_nombre_completo IS NOT NULL THEN p_nombre_completo := nullif(btrim(p_nombre_completo),''); IF p_nombre_completo IS NOT NULL AND char_length(p_nombre_completo)>120 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF; END IF;
 IF p_activo IS NULL THEN RAISE EXCEPTION 'INVALID_ACTIVE_VALUE'; END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_target_user_id) THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
 SELECT p.nombre_completo,p.rol_id,p.activo,r.nombre INTO v_old_name,rol_id,v_old_active,v_old_role FROM public.perfiles p JOIN public.roles r ON r.id=p.rol_id WHERE p.id=p_target_user_id FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'USER_PROFILE_NOT_FOUND'; END IF;
 SELECT nombre INTO v_new_role FROM public.roles WHERE id=p_rol_id; IF NOT FOUND THEN RAISE EXCEPTION 'ROLE_NOT_FOUND'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('admin_update_user_profile:'||p_target_user_id::text,0));
 SELECT id INTO v_old_worker FROM public.trabajadores WHERE auth_user_id=p_target_user_id FOR UPDATE;
 IF p_trabajador_id IS NOT NULL THEN SELECT auth_user_id INTO v_worker_owner FROM public.trabajadores WHERE id=p_trabajador_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'WORKER_NOT_FOUND'; END IF; IF v_worker_owner IS NOT NULL AND v_worker_owner<>p_target_user_id THEN RAISE EXCEPTION 'WORKER_LINK_CONFLICT'; END IF; END IF;
 IF v_old_role='Administrador' AND v_old_active IS TRUE AND (v_new_role<>'Administrador' OR p_activo IS FALSE) AND (SELECT count(*) FROM public.perfiles p JOIN public.roles r ON r.id=p.rol_id WHERE p.activo IS TRUE AND r.nombre='Administrador')<=1 THEN RAISE EXCEPTION 'LAST_ACTIVE_ADMINISTRATOR'; END IF;
 IF v_old_worker IS DISTINCT FROM p_trabajador_id THEN SELECT count(*) INTO v_active FROM public.orden_asignaciones WHERE trabajador_id IN (v_old_worker,p_trabajador_id) AND estado IN ('pendiente','en_progreso'); IF v_active>0 AND NOT p_confirm_active_assignments THEN RAISE EXCEPTION 'ADMIN_LINK_CONFIRMATION_REQUIRED:%',v_active; END IF; IF v_old_worker IS NOT NULL THEN UPDATE public.trabajadores SET auth_user_id=NULL WHERE id=v_old_worker; END IF; IF p_trabajador_id IS NOT NULL THEN UPDATE public.trabajadores SET auth_user_id=p_target_user_id WHERE id=p_trabajador_id; END IF; END IF;
 UPDATE public.perfiles SET nombre_completo=p_nombre_completo,rol_id=p_rol_id,activo=p_activo WHERE id=p_target_user_id;
 INSERT INTO public.admin_user_audit_log(actor_user_id,target_user_id,action,old_values,new_values,success) VALUES(p_actor_user_id,p_target_user_id,'update_user_profile',jsonb_build_object('nombre_completo',v_old_name,'rol',v_old_role,'activo',v_old_active,'trabajador_id',v_old_worker),jsonb_build_object('nombre_completo',p_nombre_completo,'rol_id',p_rol_id,'activo',p_activo,'trabajador_id',p_trabajador_id),TRUE);
 RETURN QUERY SELECT p_rol_id,p_activo,p_trabajador_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_update_user_profile(uuid,uuid,text,uuid,boolean,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(uuid,uuid,text,uuid,boolean,uuid,boolean) TO service_role;
COMMIT;
