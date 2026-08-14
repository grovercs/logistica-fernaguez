import { supabase } from './supabase';

export interface AssignmentWorker {
  id: string;
  auth_user_id?: string | null;
}

interface CreateOrderAssignmentInput {
  orderId: string;
  worker: AssignmentWorker;
  fechaAsignacion: string;
  horaProgramada: string;
  notas?: string | null;
  reopenClosedOrder?: boolean;
}

export async function createOrderAssignment({
  orderId,
  worker,
  fechaAsignacion,
  horaProgramada,
  notas = null,
  reopenClosedOrder = false,
}: CreateOrderAssignmentInput) {
  if (!worker.id) throw new Error('ASSIGNMENT_WORKER_INVALID');

  const { error: assignmentError } = await supabase
    .from('orden_asignaciones')
    .insert({
      orden_id: orderId,
      trabajador_id: worker.id,
      fecha_asignacion: fechaAsignacion,
      hora_programada: horaProgramada,
      notas,
      estado: 'pendiente',
    });

  if (assignmentError) throw assignmentError;

  const updates: { tecnico_id: string; estado?: string } = {
    tecnico_id: worker.auth_user_id || worker.id,
  };
  if (reopenClosedOrder) updates.estado = 'En Curso';

  const { error: legacySyncError } = await supabase
    .from('ordenes')
    .update(updates)
    .eq('id', orderId);

  return { legacySyncError };
}
