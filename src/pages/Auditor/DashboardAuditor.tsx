import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import estadisticasService from "../../services/estadisticasService";
import instanciaService, { InstanciaReporteDTO } from "../../services/instanciaService";
import Pagination, { usePagination } from "../../components/common/Pagination";

interface EstadisticasGenerales {
  totalReportes: number;
  reportesPendientes: number;
  reportesEnviados: number;
  reportesVencidos: number;
  porcentajeCumplimiento: number;
  enviadosATiempo: number;
  enviadosTarde: number;
}

interface CumplimientoPorEntidad {
  entidad: string;
  total: number;
  enviados: number;
  porcentaje: number;
}

interface CumplimientoPorResponsable {
  responsable: string;
  total: number;
  enviados: number;
  vencidos: number;
  porcentaje: number;
}

interface TendenciaMensual {
  mes: string;
  cumplimiento: number;
  enviados: number;
  vencidos: number;
}

const COLORS_ESTADO = {
  aTiempo: "#10B981",      // Verde
  tarde: "#F59E0B",        // Amarillo/Naranja
  noReportado: "#EF4444",  // Rojo
  proximoVencer: "#6B7280" // Gris
};

export default function DashboardAuditor() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EstadisticasGenerales | null>(null);
  const [instancias, setInstancias] = useState<InstanciaReporteDTO[]>([]);
  
  // Filtros
  const [filtroEntidad, setFiltroEntidad] = useState<string>("todas");
  const [filtroResponsable, setFiltroResponsable] = useState<string>("todos");
  const [filtroAnio, setFiltroAnio] = useState<number>(new Date().getFullYear());
  const [busqueda, setBusqueda] = useState("");
  
  // Datos para graficas
  const [cumplimientoPorEntidad, setCumplimientoPorEntidad] = useState<CumplimientoPorEntidad[]>([]);
  const [cumplimientoPorResponsable, setCumplimientoPorResponsable] = useState<CumplimientoPorResponsable[]>([]);
  const [tendenciaMensual, setTendenciaMensual] = useState<TendenciaMensual[]>([]);
  
  // Listas para filtros
  const [entidades, setEntidades] = useState<string[]>([]);
  const [responsables, setResponsables] = useState<string[]>([]);

  useEffect(() => {
    cargarDatos();
  }, [filtroAnio]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar estadisticas generales
      const estadisticas = await estadisticasService.obtenerDashboard();
      
      // Cargar todas las instancias para analisis
      const [pendientes, vencidos, historico] = await Promise.all([
        instanciaService.listarPendientes(),
        instanciaService.listarVencidos(),
        instanciaService.listarHistorico({}),
      ]);
      
      const todasInstancias = [...pendientes, ...historico];
      setInstancias(todasInstancias);
      
      // Extraer listas unicas para filtros
      const entidadesUnicas = [...new Set(todasInstancias.map(i => i.entidadNombre))].filter(Boolean);
      const responsablesUnicos = [...new Set(todasInstancias.map(i => i.responsableElaboracion))].filter(Boolean);
      setEntidades(entidadesUnicas);
      setResponsables(responsablesUnicos);
      
      // Calcular estadisticas
      const enviados = todasInstancias.filter(i => i.enviado);
      const vencidosSinEnviar = todasInstancias.filter(i => i.vencido && !i.enviado);
      const enviadosATiempo = enviados.filter(i => !i.diasDesviacion || i.diasDesviacion <= 0);
      const enviadosTarde = enviados.filter(i => i.diasDesviacion && i.diasDesviacion > 0);
      
      setStats({
        totalReportes: todasInstancias.length,
        reportesPendientes: pendientes.length,
        reportesEnviados: enviados.length,
        reportesVencidos: vencidosSinEnviar.length,
        porcentajeCumplimiento: todasInstancias.length > 0 
          ? Math.round((enviadosATiempo.length / todasInstancias.length) * 100)
          : 0,
        enviadosATiempo: enviadosATiempo.length,
        enviadosTarde: enviadosTarde.length,
      });
      
      // Calcular cumplimiento por entidad
      const porEntidad = entidadesUnicas.map(entidad => {
        const instanciasEntidad = todasInstancias.filter(i => i.entidadNombre === entidad);
        const enviadosEntidad = instanciasEntidad.filter(i => i.enviado && (!i.diasDesviacion || i.diasDesviacion <= 0));
        return {
          entidad: entidad.length > 20 ? entidad.substring(0, 20) + "..." : entidad,
          total: instanciasEntidad.length,
          enviados: enviadosEntidad.length,
          porcentaje: instanciasEntidad.length > 0 
            ? Math.round((enviadosEntidad.length / instanciasEntidad.length) * 100)
            : 0,
        };
      }).sort((a, b) => b.porcentaje - a.porcentaje);
      setCumplimientoPorEntidad(porEntidad);
      
      // Calcular cumplimiento por responsable
      const porResponsable = responsablesUnicos.map(resp => {
        const instanciasResp = todasInstancias.filter(i => i.responsableElaboracion === resp);
        const enviadosResp = instanciasResp.filter(i => i.enviado && (!i.diasDesviacion || i.diasDesviacion <= 0));
        const vencidosResp = instanciasResp.filter(i => i.vencido && !i.enviado);
        return {
          responsable: resp.length > 15 ? resp.substring(0, 15) + "..." : resp,
          total: instanciasResp.length,
          enviados: enviadosResp.length,
          vencidos: vencidosResp.length,
          porcentaje: instanciasResp.length > 0 
            ? Math.round((enviadosResp.length / instanciasResp.length) * 100)
            : 0,
        };
      }).sort((a, b) => b.porcentaje - a.porcentaje);
      setCumplimientoPorResponsable(porResponsable);
      
      // Calcular tendencia mensual (ultimos 6 meses)
      const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const tendencia: TendenciaMensual[] = [];
      const ahora = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const mesNum = fecha.getMonth();
        const anio = fecha.getFullYear();
        
        const instanciasMes = todasInstancias.filter(inst => {
          const fechaVenc = new Date(inst.fechaVencimientoCalculada);
          return fechaVenc.getMonth() === mesNum && fechaVenc.getFullYear() === anio;
        });
        
        const enviadosMes = instanciasMes.filter(i => i.enviado && (!i.diasDesviacion || i.diasDesviacion <= 0));
        const vencidosMes = instanciasMes.filter(i => i.vencido && !i.enviado);
        
        tendencia.push({
          mes: `${meses[mesNum]} ${anio.toString().slice(2)}`,
          cumplimiento: instanciasMes.length > 0 
            ? Math.round((enviadosMes.length / instanciasMes.length) * 100)
            : 0,
          enviados: enviadosMes.length,
          vencidos: vencidosMes.length,
        });
      }
      setTendenciaMensual(tendencia);
      
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar instancias para la tabla
  const instanciasFiltradas = instancias.filter(i => {
    if (filtroEntidad !== "todas" && i.entidadNombre !== filtroEntidad) return false;
    if (filtroResponsable !== "todos" && i.responsableElaboracion !== filtroResponsable) return false;
    if (busqueda) {
      const term = busqueda.toLowerCase();
      return (
        i.reporteNombre?.toLowerCase().includes(term) ||
        i.entidadNombre?.toLowerCase().includes(term) ||
        i.periodoReportado?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Paginacion
  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems,
    paginatedItems,
  } = usePagination(instanciasFiltradas, 10);

  // Datos para grafico de torta (distribucion de estado)
  const dataTorta = stats ? [
    { name: "A Tiempo", value: stats.enviadosATiempo, color: COLORS_ESTADO.aTiempo },
    { name: "Tarde", value: stats.enviadosTarde, color: COLORS_ESTADO.tarde },
    { name: "No Reportado", value: stats.reportesVencidos, color: COLORS_ESTADO.noReportado },
    { name: "Próx. a Vencer", value: stats.reportesPendientes - stats.reportesVencidos, color: COLORS_ESTADO.proximoVencer },
  ].filter(d => d.value > 0) : [];

  const formatFecha = (fecha: string) => {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getBadgeEstado = (instancia: InstanciaReporteDTO) => {
    if (instancia.enviado) {
      const tarde = instancia.diasDesviacion && instancia.diasDesviacion > 0;
      return tarde ? (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          Enviado Tarde
        </span>
      ) : (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          A Tiempo
        </span>
      );
    }
    if (instancia.vencido) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
          Vencido
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
        Pendiente
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Dashboard de Auditoría
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Vista de solo lectura • Métricas de cumplimiento de reportes
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Modo Auditor (Solo Lectura)
        </div>
      </div>

      {/* Metricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">% Cumplimiento</p>
          <p className="text-3xl font-bold text-blue-600">{stats?.porcentajeCumplimiento || 0}%</p>
          <p className="text-xs text-gray-400 mt-1">Enviados a tiempo / Total</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Reportes</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats?.totalReportes || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Vencidos</p>
          <p className="text-3xl font-bold text-red-600">{stats?.reportesVencidos || 0}</p>
          <p className="text-xs text-gray-400 mt-1">En riesgo de multa</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">A Tiempo</p>
          <p className="text-3xl font-bold text-green-600">{stats?.enviadosATiempo || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Fuera de Tiempo</p>
          <p className="text-3xl font-bold text-yellow-600">{stats?.enviadosTarde || 0}</p>
        </div>
      </div>

      {/* Graficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico de Torta - Distribucion de Estado */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Distribución de Estado
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dataTorta}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name = "", percent }: { name?: string; percent?: number }) => {
                  const pct = typeof percent === "number" ? `${(percent * 100).toFixed(0)}%` : "";
                  return `${name}${pct ? ` ${pct}` : ""}`;
                }}
              >
                {dataTorta.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {dataTorta.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grafico de Lineas - Tendencia Historica */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Tendencia Histórica de Cumplimiento
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={tendenciaMensual}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cumplimiento" 
                name="% Cumplimiento"
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: "#3B82F6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Grafico de Barras - Cumplimiento por Entidad */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Cumplimiento por Entidad
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cumplimientoPorEntidad.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="entidad" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === "porcentaje" ? `${value}%` : value,
                  name === "porcentaje" ? "Cumplimiento" : name
                ]}
              />
              <Bar dataKey="porcentaje" name="% Cumplimiento" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grafico de Barras - Cumplimiento por Responsable */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Cumplimiento por Responsable
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cumplimientoPorResponsable.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="responsable" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === "porcentaje" ? `${value}%` : value,
                  name === "porcentaje" ? "Cumplimiento" : name === "vencidos" ? "Vencidos" : name
                ]}
              />
              <Bar dataKey="porcentaje" name="% Cumplimiento" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtros y Tabla detallada */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Detalle de Reportes
          </h3>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Buscar reporte, entidad, periodo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-4 text-sm dark:bg-gray-700"
              />
            </div>
            <select
              value={filtroEntidad}
              onChange={(e) => setFiltroEntidad(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm dark:bg-gray-700"
            >
              <option value="todas">Todas las entidades</option>
              {entidades.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <select
              value={filtroResponsable}
              onChange={(e) => setFiltroResponsable(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm dark:bg-gray-700"
            >
              <option value="todos">Todos los responsables</option>
              {responsables.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporte</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsable</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron reportes con los filtros aplicados
                  </td>
                </tr>
              ) : (
                paginatedItems.map((instancia) => (
                  <tr key={instancia.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white text-sm">
                        {instancia.reporteNombre}
                      </p>
                      <p className="text-xs text-gray-500">{instancia.reporteId}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {instancia.entidadNombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {instancia.periodoReportado}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {instancia.responsableElaboracion}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatFecha(instancia.fechaVencimientoCalculada)}
                    </td>
                    <td className="px-4 py-3">
                      {getBadgeEstado(instancia)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
}