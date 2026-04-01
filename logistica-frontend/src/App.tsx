
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Calendario from './pages/Calendario';
import RbacDashboard from './pages/RbacDashboard';
import Roles from './pages/Roles';
import Permisos from './pages/Permisos';
import Ordenes from './pages/Ordenes';
import OrdenDetalle from './pages/OrdenDetalle';
import Liquidaciones from './pages/Liquidaciones';
import Aseguradoras from './pages/Aseguradoras';
import Trabajadores from './pages/Trabajadores';
import Usuarios from './pages/Usuarios';
import Bd from './pages/Bd';
import Login from './pages/Login';
import TareasFrecuentes from './pages/TareasFrecuentes';

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
          <Route path="liquidaciones" element={<Liquidaciones />} />
          <Route path="aseguradoras" element={<Aseguradoras />} />
          <Route path="tareas-frecuentes" element={<TareasFrecuentes />} />
          <Route path="trabajadores" element={<Trabajadores />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="bd" element={<Bd />} />
          <Route path="rbac" element={<RbacDashboard />} />
          <Route path="roles" element={<Roles />} />
          <Route path="permisos" element={<Permisos />} />
          {/* Add more routes here later */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
