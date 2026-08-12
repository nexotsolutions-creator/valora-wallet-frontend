import { Route, Routes } from "react-router-dom";
import { GuestRoute } from "./shared/components/GuestRoute";
import { NotFoundRedirect } from "./shared/components/NotFoundRedirect";
import { ProtectedRoute } from "./shared/components/ProtectedRoute";
import { ExchangeForm } from "./features/exchange/ExchangeForm";
import { HistoryPage } from "./features/history/HistoryPage";
import { DashboardLayout } from "./layouts/DashboardLayout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { Login } from "./pages/Login/Login";
import { Registro } from "./pages/Registro/Registro";
import { RecuperarContrasena } from "./pages/RecuperarContrasena/RecuperarContrasena";
import { ResetPassword } from "./pages/ResetPassword/ResetPassword";
import { Tarjetas } from "./pages/Tarjetas/Tarjetas";
import { Usuario } from "./pages/Usuario/Usuario";

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
      </Route>
      {/* Sin GuestRoute ni ProtectedRoute a propósito: cambiar contraseña no
          debería depender de no estar logueado (caso borde: usuario logueado
          en otro dispositivo clickea el link del mail) */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        {/* Cualquier ruta privada futura (ej: /transactions) va como hija acá adentro, no afuera */}
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/usuario" element={<Usuario />} />
          <Route path="/tarjetas" element={<Tarjetas />} />
          <Route path="/intercambio" element={<ExchangeForm />} />
          <Route path="/actividad" element={<HistoryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}

export default App;
