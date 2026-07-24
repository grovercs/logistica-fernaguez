import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import Dashboard from './pages/Dashboard';
import Calendario from './pages/Calendario';
import Ordenes from './pages/Ordenes';
import OrdenDetalle from './pages/OrdenDetalle';
import Liquidaciones from './pages/Liquidaciones';
import Aseguradoras from './pages/Aseguradoras';
import Trabajadores from './pages/Trabajadores';
import Login from './pages/Login';
import TareasFrecuentes from './pages/TareasFrecuentes';
import Configuracion from './pages/Configuracion';
import Especialidades from './pages/Especialidades';
import Ayuda from './pages/Ayuda';
import AdminMaintenance from './pages/AdminMaintenance';

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
          <Route path="liquidaciones" element={<RequireRole allowedRoles={['Administrador', 'Editor']}><Liquidaciones /></RequireRole>} />

          {/* Rutas protegidas: solo Admin y Editor */}
          <Route path="trabajadores" element={<RequireRole allowedRoles={['Administrador', 'Editor']}><Trabajadores /></RequireRole>} />
          <Route path="usuarios" element={<RequireRole allowedRoles={['Administrador', 'Editor']}><AdminMaintenance /></RequireRole>} />

          {/* Rutas protegidas: solo Administrador */}
          <Route path="aseguradoras" element={<RequireRole><Aseguradoras /></RequireRole>} />
          <Route path="tareas-frecuentes" element={<RequireRole><TareasFrecuentes /></RequireRole>} />
          <Route path="especialidades" element={<RequireRole><Especialidades /></RequireRole>} />
          <Route path="bd" element={<RequireRole><AdminMaintenance /></RequireRole>} />
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
