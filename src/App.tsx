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

// Componentes de tablas
import TableUserRol from "./components/tables/BasicTables/TableUserRol";
import TableEntidades from "./components/tables/BasicTables/TableEntidades";
import TableReporteS from "./components/tables/BasicTables/TableReporteS";

// Paginas
import GestionInstancias from "./pages/Instancias/GestionInstancias";
import HistoricoReportes from "./pages/Historico/HistoricoReportes";
import SupervisionReportes from "./pages/Supervision/SupervisionReportes";
import MisReportes from "./pages/MisReportes/MisReportes";
import DashboardAuditor from "./pages/Auditor/DashboardAuditor";

// Paginas wrapper
const Reportes = () => (
  <div className="p-6">
    <TableReporteS />
  </div>
);

const Usuarios = () => (
  <div className="p-6">
    <TableUserRol />
  </div>
);

const Entidades = () => (
  <div className="p-6">
    <TableEntidades />
  </div>
);

// Ruta protegida
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/signin" />;
}

// Ruta con restriccion de rol
function RoleRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: string[] 
}) {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role || "")) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Layout protegido */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          {/* Dashboard - Todos los roles (filtrado segun rol en el componente) */}
          <Route index path="/" element={<Home />} />
          
          {/* Perfil - Todos */}
          <Route path="/profile" element={<UserProfiles />} />

          {/* Calendario - Todos (filtrado segun rol) */}
          <Route path="/calendario" element={<Calendar />} />

          {/* ============ RUTAS ADMINISTRADOR ============ */}
          <Route
            path="/reportes"
            element={
              <RoleRoute allowedRoles={["administrador"]}>
                <Reportes />
              </RoleRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <RoleRoute allowedRoles={["administrador"]}>
                <Usuarios />
              </RoleRoute>
            }
          />
          <Route
            path="/entidades"
            element={
              <RoleRoute allowedRoles={["administrador"]}>
                <Entidades />
              </RoleRoute>
            }
          />
          <Route
            path="/instancias"
            element={
              <RoleRoute allowedRoles={["administrador"]}>
                <GestionInstancias />
              </RoleRoute>
            }
          />

          {/* ============ RUTAS SUPERVISOR ============ */}
          <Route
            path="/supervision"
            element={
              <RoleRoute allowedRoles={["supervisor", "administrador"]}>
                <SupervisionReportes />
              </RoleRoute>
            }
          />

          {/* ============ RUTAS RESPONSABLE ============ */}
          <Route
            path="/mis-reportes"
            element={
              <RoleRoute allowedRoles={["responsable", "administrador"]}>
                <MisReportes />
              </RoleRoute>
            }
          />

          {/* ============ HISTORICO - Admin, Supervisor, Auditor ============ */}
          <Route
            path="/historico"
            element={
              <RoleRoute allowedRoles={["administrador", "supervisor", "auditor"]}>
                <HistoricoReportes />
              </RoleRoute>
            }
          />

          {/* ============ DASHBOARD AUDITOR ============ */}
          <Route
            path="/auditoria"
            element={
              <RoleRoute allowedRoles={["auditor", "administrador"]}>
                <DashboardAuditor />
              </RoleRoute>
            }
          />
        </Route>

        {/* Login / Registro (publico) */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}