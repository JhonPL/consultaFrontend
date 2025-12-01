import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
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

// Componente para proteger rutas - redirige si no está autenticado
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p className="mt-4 text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }
  
  // Si no está autenticado, redirigir a login
  if (!isAuthenticated || !user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}

// Componente para proteger rutas por rol
function RoleRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: string[] 
}) {
  const { user, isAuthenticated } = useAuth();
  
  // Si no está autenticado, redirigir a login
  if (!isAuthenticated || !user) {
    return <Navigate to="/signin" replace />;
  }
  
  // Si no tiene el rol permitido, redirigir al dashboard
  if (!allowedRoles.includes(user.role || "")) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

// Componente para rutas públicas (login) - redirige si ya está autenticado
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
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
  
  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Prevenir navegación hacia atrás después de logout
  useEffect(() => {
    const handlePopState = () => {
      if (!isAuthenticated && location.pathname !== "/signin" && location.pathname !== "/signup") {
        window.history.pushState(null, "", "/signin");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthenticated, location]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Rutas públicas */}
        <Route 
          path="/signin" 
          element={
            <PublicRoute>
              <SignIn />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          } 
        />

        {/* Layout protegido */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          {/* Dashboard - Todos los roles */}
          <Route index path="/" element={<Home />} />
          
          {/* Perfil - Todos */}
          <Route path="/profile" element={<UserProfiles />} />

          {/* Calendario - Todos */}
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

          {/* ============ HISTORICO - Admin, Supervisor ============ */}
          <Route
            path="/historico"
            element={
              <RoleRoute allowedRoles={["administrador", "supervisor"]}>
                <HistoricoReportes />
              </RoleRoute>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}