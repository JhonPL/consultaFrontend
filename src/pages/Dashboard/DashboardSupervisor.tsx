import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import estadisticasService, { EstadisticasDTO } from "../../services/estadisticasService";
import MetricasReportes from "../../components/dashboard/MetricasReportes";
import CumplimientoChart from "../../components/dashboard/CumplimientoChart";
import ProximosVencerTable from "../../components/dashboard/ProximosVencerTable";
import VencidosTable from "../../components/dashboard/VencidosTable";

export default function DashboardSupervisor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasDTO | null>(null);
  const [proximosVencer, setProximosVencer] = useState<any[]>([]);
  const [vencidos, setVencidos] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      cargarDatos();
    }
  }, [user]);

  const cargarDatos = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      // Supervisor ve solo los que supervisa (filtrado por supervisorId)
      const [stats, proximos, vencidosData] = await Promise.all([
        estadisticasService.obtenerDashboardSupervisor(user.id),
        estadisticasService.obtenerProximosVencerSupervisor(user.id, 7),
        estadisticasService.obtenerVencidosSupervisor(user.id),
      ]);
      
      setEstadisticas(stats);
      setProximosVencer(proximos.reportes || []);
      setVencidos(vencidosData.reportes || []);
    } catch (err: any) {
      console.error("Error cargando dashboard:", err);
      // Si no existen los endpoints específicos, usar los generales
      try {
        const [stats, proximos, vencidosData] = await Promise.all([
          estadisticasService.obtenerDashboard(),
          estadisticasService.obtenerProximosVencer(7),
          estadisticasService.obtenerVencidos(),
        ]);
        
        setEstadisticas(stats);
        setProximosVencer(proximos.reportes || []);
        setVencidos(vencidosData.reportes || []);
      } catch (fallbackErr) {
        setError("Error al cargar el dashboard.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600 dark:text-gray-400">Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={cargarDatos}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!estadisticas) return null;

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <MetricasReportes
        totalObligaciones={estadisticas.totalObligaciones}
        totalEnviadosATiempo={estadisticas.totalEnviadosATiempo}
        totalVencidos={estadisticas.totalVencidos}
        totalPendientes={estadisticas.totalPendientes}
        porcentajeCumplimiento={estadisticas.porcentajeCumplimientoATiempo || 0}
        reportesProximos7Dias={estadisticas.reportesProximosVencer7Dias}
      />

      {/* Gráfico de cumplimiento + Próximos a vencer */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-5">
          <CumplimientoChart
            porcentaje={estadisticas.porcentajeCumplimientoATiempo || 0}
            responsableProblema={estadisticas.responsableMayorIncumplimiento}
            incumplimientosResponsable={estadisticas.incumplimientosResponsableProblema}
          />
        </div>
        <div className="col-span-12 xl:col-span-7">
          <ProximosVencerTable
            reportes={proximosVencer}
            onVerTodos={() => navigate("/calendario")}
          />
        </div>
      </div>

      {/* Reportes vencidos */}
      {vencidos.length > 0 && (
        <VencidosTable
          reportes={vencidos}
          onVerTodos={() => navigate("/supervision")}
        />
      )}
    </div>
  );
}