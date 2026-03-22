import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MobileLayout from './components/MobileLayout';
import MobileLogin from './pages/mobile/MobileLogin';
import MobileDetalleOrden from './pages/mobile/MobileDetalleOrden';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MobileLayout />}>
          <Route path="m/login" element={<MobileLogin />} />
          <Route path="m/ordenes/:id" element={<MobileDetalleOrden />} />
          <Route path="*" element={<Navigate to="/m/login" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
