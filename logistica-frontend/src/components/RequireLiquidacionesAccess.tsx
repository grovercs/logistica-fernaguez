import { Navigate } from 'react-router-dom';
import { useLiquidacionesAccess } from '../hooks/useLiquidacionesAccess';

interface Props {
  children: React.ReactNode;
}

export default function RequireLiquidacionesAccess({ children }: Props) {
  const { isAllowed, loading } = useLiquidacionesAccess();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-slate-600 font-bold">
        Verificando permisos...
      </div>
    );
  }

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
