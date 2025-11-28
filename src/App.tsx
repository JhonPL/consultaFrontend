import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import { useAuth } from "./context/AuthContext";
import TableReportes from "./components/tables/BasicTables/TableReporteS";
import TableUserRol from "./components/tables/BasicTables/TableUserRol";
import TableEntidades from "./components/tables/BasicTables/TableEntidades";
import GestionInstancias from "./pages/Instancias/GestionInstancias";
import HistoricoReportes from "./pages/Historico/HistoricoReportes";


// ✅ Componentes de páginas
const Reportes = () => <div className="p-6 text-gray-800 dark:text-gray-100"><TableReportes/></div>;
const Usuarios = () => <div className="p-6 text-gray-800 dark:text-gray-100"><TableUserRol/></div>;
const Historico = () => <div className="p-6 text-gray-800 dark:text-gray-100">📊 Histórico</div>;
const Entidades = () => <div className="p-6 text-gray-800 dark:text-gray-100"><TableEntidades/></div>;

const MisReportes = () => <div className="p-6 text-gray-800 dark:text-gray-100"><TableReportes/></div>;
const ReportesResponsables = () => <div className="p-6 text-gray-800 dark:text-gray-100"><TableReportes/></div>;
const Consultas = () => <div className="p-6 text-gray-800 dark:text-gray-100">🔍 Consulta General</div>;
const Trazabilidad = () => <div className="p-6 text-gray-800 dark:text-gray-100">📈 Trazabilidad / Métricas</div>;

// ✅ Ruta protegida
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <>{user ? children : <Navigate to="/signin" />}</>;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ✅ Layout protegido */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          {/* Rutas comunes */}
          <Route index path="/" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/profile" element={<UserProfiles />} />

          {/* 🔹 Administrador */}
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/historico" element={<HistoricoReportes />} />
          <Route path="/entidades" element={<Entidades />} />
          <Route path="/instancias" element={<GestionInstancias />} />

          {/* 🔹 Responsable */}
          <Route path="/mis-reportes" element={<MisReportes />} />

          {/* 🔹 Supervisor */}
          <Route path="/reportes-responsables" element={<ReportesResponsables />} />
          <Route path="/metricas" element={<Trazabilidad />} />

          {/* 🔹 Auditor */}
          <Route path="/consultas" element={<Consultas />} />
          <Route path="/trazabilidad" element={<Trazabilidad />} />
        </Route>

        {/* ✅ Login / Registro */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}