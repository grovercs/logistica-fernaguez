import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MobileLayout from './components/MobileLayout';
import MobileLogin from './pages/mobile/MobileLogin';
import MobileOrdenes from './pages/mobile/MobileOrdenes';
import MobileDetalleOrden from './pages/mobile/MobileDetalleOrden';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/m" element={<MobileLayout />}>
          <Route path="login" element={<MobileLogin />} />
          <Route path="ordenes" element={<MobileOrdenes />} />
          <Route path="ordenes/:id" element={<MobileDetalleOrden />} />
          <Route path="" element={<Navigate to="ordenes" replace />} />
          <Route path="*" element={<Navigate to="login" replace />} />
        </Route>
        <Route path="/" element={<Navigate to="/m/ordenes" replace />} />
        <Route path="*" element={<Navigate to="/m/ordenes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
// Netlify Pro deploy Wed, Apr  1, 2026  8:32:12 PM
