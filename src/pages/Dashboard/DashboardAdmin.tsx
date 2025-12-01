import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import estadisticasService, { EstadisticasDTO } from "../../services/estadisticasService";
import MetricasReportes from "../../components/dashboard/MetricasReportes";
import CumplimientoChart from "../../components/dashboard/CumplimientoChart";
import ProximosVencerTable from "../../components/dashboard/ProximosVencerTable";
import VencidosTable from "../../components/dashboard/VencidosTable";

export default function DashboardAdmin() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasDTO | null>(null);
  const [proximosVencer, setProximosVencer] = useState<any[]>([]);
  const [vencidos, setVencidos] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Re-cargar dashboard cuando se actualicen reportes en otra parte de la app
  useEffect(() => {
    const handler = () => {
      cargarDatos();
    };
    window.addEventListener('reportes:updated', handler);
    return () => window.removeEventListener('reportes:updated', handler);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Admin ve TODO el sistema
      const [stats, proximos, vencidosData] = await Promise.all([
        estadisticasService.obtenerDashboard(),
        estadisticasService.obtenerProximosVencer(7),
        estadisticasService.obtenerVencidos(),
      ]);
      setEstadisticas(stats);
      // Normalizar datos para evitar discrepancias entre DTOs del backend
      // y calcular días usando solo la parte de fecha (evita off-by-one por zonas horarias).
      const msPerDay = 24 * 60 * 60 * 1000;

      const parseDateOnly = (s: any): Date | null => {
        if (!s) return null;
        // Formato YYYY-MM-DD
        const fullMatch = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(String(s));
        if (fullMatch) {
          const y = Number(fullMatch[1]);
          const m = Number(fullMatch[2]) - 1;
          const d = Number(fullMatch[3]);
          return new Date(y, m, d);
        }
        // Formato YYYY-MM -> treat as first day of month
        const monthMatch = /^\s*(\d{4})-(\d{2})\s*$/.exec(String(s));
        if (monthMatch) {
          const y = Number(monthMatch[1]);
          const m = Number(monthMatch[2]) - 1;
          return new Date(y, m, 1);
        }
        // Fallback: try Date and normalize to local date
        const d = new Date(s);
        if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return null;
      };

      const now = new Date();

      const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const normalizeVencido = (item: any) => {
        // Usar SOLO fechaVencimiento real
        const parsed = parseDateOnly(item.fechaVencimiento);

        const fechaEnd = parsed ? endOfDay(parsed) : null;

        const diasVencido = fechaEnd
          ? Math.ceil((now.getTime() - fechaEnd.getTime()) / msPerDay)
          : 0;

        return {
          id: item.id ?? item.reporteId,
          reporteNombre: item.reporteNombre ?? item.nombre ?? "",
          entidadNombre: item.entidadNombre ?? item.entidad ?? "",
          fechaVencimiento: item.fechaVencimiento,
          diasVencido,
          responsable: item.responsable ?? "",
        };
      };


      const normalizeProximo = (item: any) => {
        const parsed = parseDateOnly(item.fechaVencimiento ?? item.periodoReportado);
        const fechaEnd = parsed ? endOfDay(parsed) : null;
        const diasRestantes = fechaEnd ? Math.ceil((fechaEnd.getTime() - now.getTime()) / msPerDay) : null;

        return {
          id: item.id ?? item.reporteId ?? `${item.entidad ?? 'sin-entidad'}-${item.periodoReportado ?? ''}`,
          reporteNombre: item.reporteNombre ?? item.nombre ?? item.reporte ?? "",
          entidadNombre: item.entidad ?? item.entidadNombre ?? "",
          fechaVencimiento: item.fechaVencimiento ?? item.periodoReportado ?? "",
          diasRestantes: typeof item.diasRestantes === 'number' ? item.diasRestantes : (diasRestantes ?? 0),
          responsable: item.responsable ?? "",
        };
      };

      const normalizedProximos = (proximos.reportes || []).map(normalizeProximo);
      const normalizedVencidos = (vencidosData.reportes || []).map(normalizeVencido);

      setEstadisticas(stats);
      setProximosVencer(normalizedProximos);
      setVencidos(normalizedVencidos);
    } catch (err: any) {
      console.error("Error cargando dashboard:", err);
      setError("Error al cargar el dashboard. Verifique que el backend esté ejecutándose.");
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
      {/* Header con botón actualizar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div></div>
        <button
          onClick={cargarDatos}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

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
            entidadProblema={estadisticas.entidadMayorIncumplimiento}
            incumplimientosEntidad={estadisticas.incumplimientosEntidadProblema}
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
          onVerTodos={() => navigate("/reportes")}
        />
      )}
    </div>
  );
}