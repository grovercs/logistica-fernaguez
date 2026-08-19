import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import Dashboard from './pages/Dashboard';
import Calendario from './pages/Calendario';
import Ordenes from './pages/Ordenes';
import OrdenDetalle from './pages/OrdenDetalle';
import Liquidaciones from './pages/Liquidaciones';
import LiquidacionesGestion from './components/liquidaciones/LiquidacionesGestion';
import LiquidacionesEstadisticas from './components/liquidaciones/LiquidacionesEstadisticas';
import RequireLiquidacionesAccess from './components/RequireLiquidacionesAccess';
import Aseguradoras from './pages/Aseguradoras';
import Trabajadores from './pages/Trabajadores';
import Login from './pages/Login';
import TareasFrecuentes from './pages/TareasFrecuentes';
import Configuracion from './pages/Configuracion';
import Especialidades from './pages/Especialidades';
import Ayuda from './pages/Ayuda';
import AdminMaintenance from './pages/AdminMaintenance';
import Usuarios from './pages/Usuarios';
import BackupCenter from './pages/BackupCenter';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="ordenes" element={<Ordenes />} />
          <Route path="ordenes/:id" element={<OrdenDetalle />} />
          <Route path="liquidaciones" element={<RequireLiquidacionesAccess><Liquidaciones /></RequireLiquidacionesAccess>}>
            <Route index element={<Navigate to="estadisticas" replace />} />
            <Route path="gestion" element={<LiquidacionesGestion />} />
            <Route path="estadisticas" element={<LiquidacionesEstadisticas />} />
          </Route>

          {/* Rutas protegidas: solo Admin y Editor */}
          <Route path="trabajadores" element={<RequireRole allowedRoles={['Administrador', 'Editor']}><Trabajadores /></RequireRole>} />

          {/* Rutas protegidas: solo Administrador */}
          <Route path="usuarios" element={<RequireRole><Usuarios /></RequireRole>} />
          <Route path="aseguradoras" element={<RequireRole><Aseguradoras /></RequireRole>} />
          <Route path="tareas-frecuentes" element={<RequireRole><TareasFrecuentes /></RequireRole>} />
          <Route path="especialidades" element={<RequireRole><Especialidades /></RequireRole>} />
          <Route path="bd" element={<RequireRole><BackupCenter /></RequireRole>} />
          <Route path="rbac" element={<RequireRole><AdminMaintenance /></RequireRole>} />
          <Route path="roles" element={<RequireRole><AdminMaintenance /></RequireRole>} />
          <Route path="permisos" element={<RequireRole><AdminMaintenance /></RequireRole>} />
          <Route path="configuracion" element={<RequireRole><Configuracion /></RequireRole>} />
          <Route path="ayuda" element={<Ayuda />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
