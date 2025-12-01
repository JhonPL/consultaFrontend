import { useState, useEffect, useMemo } from "react";
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
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import instanciaService, { InstanciaReporteDTO } from "../../services/instanciaService";

const COLORS_ESTADO = {
  aTiempo: "#10B981",
  tarde: "#F59E0B",
  noReportado: "#EF4444",
  pendiente: "#6B7280"
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function DashboardAuditor() {
  const [loading, setLoading] = useState(true);
  const [instancias, setInstancias] = useState<InstanciaReporteDTO[]>([]);
  
  // Solo filtro por año
  const [filtroAnio, setFiltroAnio] = useState<number>(new Date().getFullYear());
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [pendientes, historico] = await Promise.all([
        instanciaService.listarPendientes(),
        instanciaService.listarHistorico({}),
      ]);
      
      const todasInstancias = [...pendientes, ...historico];
      setInstancias(todasInstancias);
      
      // Extraer años disponibles
      const anios = [...new Set(todasInstancias.map(i => new Date(i.fechaVencimientoCalculada).getFullYear()))].sort((a, b) => b - a);
      setAniosDisponibles(anios.length > 0 ? anios : [new Date().getFullYear()]);
      
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por año
  const instanciasAnio = useMemo(() => {
    return instancias.filter(i => {
      const fechaVenc = new Date(i.fechaVencimientoCalculada);
      return fechaVenc.getFullYear() === filtroAnio;
    });
  }, [instancias, filtroAnio]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const enviados = instanciasAnio.filter(i => i.enviado);
    const vencidosSinEnviar = instanciasAnio.filter(i => i.vencido && !i.enviado);
    const enviadosATiempo = enviados.filter(i => !i.diasDesviacion || i.diasDesviacion <= 0);
    const enviadosTarde = enviados.filter(i => i.diasDesviacion && i.diasDesviacion > 0);
    const pendientes = instanciasAnio.filter(i => !i.enviado && !i.vencido);
    
    const diasRetrasoTotal = enviadosTarde.reduce((sum, i) => sum + (i.diasDesviacion || 0), 0);
    const diasRetrasoPromedio = enviadosTarde.length > 0 ? Math.round(diasRetrasoTotal / enviadosTarde.length) : 0;
    
    return {
      total: instanciasAnio.length,
      vencidos: vencidosSinEnviar.length,
      enviadosATiempo: enviadosATiempo.length,
      enviadosTarde: enviadosTarde.length,
      pendientes: pendientes.length,
      porcentajeCumplimiento: instanciasAnio.length > 0 
        ? Math.round((enviadosATiempo.length / instanciasAnio.length) * 100)
        : 0,
      diasRetrasoPromedio,
    };
  }, [instanciasAnio]);

  // Datos para grafico de torta
  const dataTorta = useMemo(() => [
    { name: "A Tiempo", value: stats.enviadosATiempo, color: COLORS_ESTADO.aTiempo },
    { name: "Tarde", value: stats.enviadosTarde, color: COLORS_ESTADO.tarde },
    { name: "Vencido", value: stats.vencidos, color: COLORS_ESTADO.noReportado },
    { name: "Pendiente", value: stats.pendientes, color: COLORS_ESTADO.pendiente },
  ].filter(d => d.value > 0), [stats]);

  // Cumplimiento por entidad - ordenado de menor a mayor
  const cumplimientoPorEntidad = useMemo(() => {
    const entidadesUnicas = [...new Set(instanciasAnio.map(i => i.entidadNombre))];
    return entidadesUnicas.map(entidad => {
      const instanciasEntidad = instanciasAnio.filter(i => i.entidadNombre === entidad);
      const enviadosATiempo = instanciasEntidad.filter(i => i.enviado && (!i.diasDesviacion || i.diasDesviacion <= 0));
      const vencidos = instanciasEntidad.filter(i => i.vencido && !i.enviado);
      return {
        entidad,
        entidadCorta: entidad.length > 20 ? entidad.substring(0, 20) + "..." : entidad,
        total: instanciasEntidad.length,
        vencidos: vencidos.length,
        porcentaje: instanciasEntidad.length > 0 
          ? Math.round((enviadosATiempo.length / instanciasEntidad.length) * 100)
          : 0,
      };
    }).sort((a, b) => a.porcentaje - b.porcentaje);
  }, [instanciasAnio]);

  // Cumplimiento por responsable - ordenado de menor a mayor
  const cumplimientoPorResponsable = useMemo(() => {
    const responsablesUnicos = [...new Set(instanciasAnio.map(i => i.responsableElaboracion))];
    return responsablesUnicos.map(resp => {
      const instanciasResp = instanciasAnio.filter(i => i.responsableElaboracion === resp);
      const enviadosATiempo = instanciasResp.filter(i => i.enviado && (!i.diasDesviacion || i.diasDesviacion <= 0));
      const vencidos = instanciasResp.filter(i => i.vencido && !i.enviado);
      return {
        responsable: resp,
        responsableCorto: resp.length > 18 ? resp.substring(0, 18) + "..." : resp,
        total: instanciasResp.length,
        vencidos: vencidos.length,
        porcentaje: instanciasResp.length > 0 
          ? Math.round((enviadosATiempo.length / instanciasResp.length) * 100)
          : 0,
      };
    }).sort((a, b) => a.porcentaje - b.porcentaje);
  }, [instanciasAnio]);

  // Mayor y menor cumplimiento
  const mejorEntidad = cumplimientoPorEntidad.length > 0 ? cumplimientoPorEntidad[cumplimientoPorEntidad.length - 1] : null;
  const peorEntidad = cumplimientoPorEntidad.length > 0 ? cumplimientoPorEntidad[0] : null;
  const mejorResponsable = cumplimientoPorResponsable.length > 0 ? cumplimientoPorResponsable[cumplimientoPorResponsable.length - 1] : null;
  const peorResponsable = cumplimientoPorResponsable.length > 0 ? cumplimientoPorResponsable[0] : null;

  // Tendencia mensual
  const tendenciaMensual = useMemo(() => {
    return MESES.map((mes, idx) => {
      const instanciasMes = instancias.filter(i => {
        const fecha = new Date(i.fechaVencimientoCalculada);
        return fecha.getFullYear() === filtroAnio && fecha.getMonth() === idx;
      });
      const enviadosATiempo = instanciasMes.filter(i => i.enviado && (!i.diasDesviacion || i.diasDesviacion <= 0));
      return {
        mes,
        total: instanciasMes.length,
        cumplimiento: instanciasMes.length > 0 
          ? Math.round((enviadosATiempo.length / instanciasMes.length) * 100)
          : 0,
      };
    }).filter(m => m.total > 0);
  }, [instancias, filtroAnio]);

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
      {/* Selector de año */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Año:</label>
        <select
          value={filtroAnio}
          onChange={(e) => setFiltroAnio(Number(e.target.value))}
          className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-4 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          {aniosDisponibles.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* KPI Principal */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-blue-100 text-sm">Porcentaje de Cumplimiento {filtroAnio}</p>
            <p className="text-5xl font-bold">{stats.porcentajeCumplimiento}%</p>
            <p className="text-blue-200 text-sm mt-1">
              {stats.enviadosATiempo} de {stats.total} reportes enviados a tiempo
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-blue-100">Total</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-300">{stats.enviadosATiempo}</p>
              <p className="text-xs text-blue-100">A Tiempo</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-300">{stats.enviadosTarde}</p>
              <p className="text-xs text-blue-100">Tarde</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-300">{stats.vencidos}</p>
              <p className="text-xs text-blue-100">Vencidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Mayor/Menor Cumplimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entidad con MAYOR cumplimiento */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entidad Mayor Cumplimiento</span>
          </div>
          {mejorEntidad ? (
            <>
              <p className="text-lg font-semibold text-gray-800 dark:text-white truncate" title={mejorEntidad.entidad}>
                {mejorEntidad.entidad}
              </p>
              <p className="text-3xl font-bold text-green-600">{mejorEntidad.porcentaje}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{mejorEntidad.total} reportes</p>
            </>
          ) : (
            <p className="text-gray-400">Sin datos</p>
          )}
        </div>

        {/* Entidad con MENOR cumplimiento */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entidad Menor Cumplimiento</span>
          </div>
          {peorEntidad ? (
            <>
              <p className="text-lg font-semibold text-gray-800 dark:text-white truncate" title={peorEntidad.entidad}>
                {peorEntidad.entidad}
              </p>
              <p className="text-3xl font-bold text-red-600">{peorEntidad.porcentaje}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{peorEntidad.total} reportes • {peorEntidad.vencidos} vencidos</p>
            </>
          ) : (
            <p className="text-gray-400">Sin datos</p>
          )}
        </div>

        {/* Responsable con MAYOR cumplimiento */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Responsable Mayor Cumplimiento</span>
          </div>
          {mejorResponsable ? (
            <>
              <p className="text-lg font-semibold text-gray-800 dark:text-white truncate" title={mejorResponsable.responsable}>
                {mejorResponsable.responsable}
              </p>
              <p className="text-3xl font-bold text-green-600">{mejorResponsable.porcentaje}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{mejorResponsable.total} reportes</p>
            </>
          ) : (
            <p className="text-gray-400">Sin datos</p>
          )}
        </div>

        {/* Responsable con MENOR cumplimiento */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Responsable Menor Cumplimiento</span>
          </div>
          {peorResponsable ? (
            <>
              <p className="text-lg font-semibold text-gray-800 dark:text-white truncate" title={peorResponsable.responsable}>
                {peorResponsable.responsable}
              </p>
              <p className="text-3xl font-bold text-red-600">{peorResponsable.porcentaje}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{peorResponsable.total} reportes • {peorResponsable.vencidos} vencidos</p>
            </>
          ) : (
            <p className="text-gray-400">Sin datos</p>
          )}
        </div>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pendientes/No Enviados</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.pendientes}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Días Retraso Promedio</p>
          <p className="text-2xl font-bold text-orange-600">{stats.diasRetrasoPromedio}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Entidades</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{cumplimientoPorEntidad.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Responsables</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{cumplimientoPorResponsable.length}</p>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Torta - Distribución de Estado */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Distribución por Estado
          </h3>
          {dataTorta.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={dataTorta}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dataTorta.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, "Reportes"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {dataTorta.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400">
              Sin datos para el año seleccionado
            </div>
          )}
        </div>

        {/* Tendencia Mensual */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Tendencia de Cumplimiento {filtroAnio}
          </h3>
          {tendenciaMensual.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tendenciaMensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip formatter={(value: number) => [`${value}%`, "Cumplimiento"]} />
                <Line 
                  type="monotone" 
                  dataKey="cumplimiento" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400">
              Sin datos para el año seleccionado
            </div>
          )}
        </div>

        {/* Barras - Por Entidad */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Cumplimiento por Entidad
          </h3>
          {cumplimientoPorEntidad.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(250, cumplimientoPorEntidad.length * 35)}>
              <BarChart data={cumplimientoPorEntidad.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis dataKey="entidadCorta" type="category" width={140} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, "Cumplimiento"]}
                  labelFormatter={(label) => cumplimientoPorEntidad.find(e => e.entidadCorta === label)?.entidad || label}
                />
                <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]}>
                  {cumplimientoPorEntidad.slice(0, 10).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.porcentaje >= 80 ? "#10B981" : entry.porcentaje >= 50 ? "#F59E0B" : "#EF4444"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              Sin datos para el año seleccionado
            </div>
          )}
        </div>

        {/* Barras - Por Responsable */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Cumplimiento por Responsable
          </h3>
          {cumplimientoPorResponsable.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(250, cumplimientoPorResponsable.length * 35)}>
              <BarChart data={cumplimientoPorResponsable.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis dataKey="responsableCorto" type="category" width={130} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, "Cumplimiento"]}
                  labelFormatter={(label) => cumplimientoPorResponsable.find(r => r.responsableCorto === label)?.responsable || label}
                />
                <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]}>
                  {cumplimientoPorResponsable.slice(0, 10).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.porcentaje >= 80 ? "#10B981" : entry.porcentaje >= 50 ? "#F59E0B" : "#EF4444"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              Sin datos para el año seleccionado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}