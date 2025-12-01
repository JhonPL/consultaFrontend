import { useAuth } from "../../context/AuthContext";
import PageMeta from "../../components/common/PageMeta";

// Dashboards por rol
import DashboardAdmin from "./DashboardAdmin";
import DashboardSupervisor from "./DashboardSupervisor";
import DashboardResponsable from "./DashboardResponsable";
import DashboardAuditor from "../Auditor/DashboardAuditor";

export default function Home() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen text-xl text-gray-700 dark:text-gray-300">
        No autorizado. Inicie sesión nuevamente.
      </div>
    );
  }

  const { role } = user;

  switch (role) {
    case "administrador":
      return (
        <>
          <PageMeta title="Dashboard Global" description="Vista global del sistema" />
          <DashboardAdmin />
        </>
      );
    
    case "supervisor":
      return (
        <>
          <PageMeta title="Dashboard" description="Reportes de mi equipo" />
          <DashboardSupervisor />
        </>
      );
    
    case "responsable":
      return (
        <>
          <PageMeta title="Dashboard" description="Mis reportes asignados" />
          <DashboardResponsable />
        </>
      );
    
    case "auditor":
      return (
        <>
          <PageMeta title="Dashboard de Cumplimiento" description="Métricas y análisis" />
          <DashboardAuditor />
        </>
      );
    
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Rol no reconocido: {role}</p>
        </div>
      );
  }
}