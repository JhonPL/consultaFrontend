import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import instanciaService, { InstanciaReporteDTO } from "../../services/instanciaService";
import entidadService, { Entidad } from "../../services/entidadService";

const HistoricoReportes: React.FC = () => {
  const [historico, setHistorico] = useState<InstanciaReporteDTO[]>([]);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filterEntidad, setFilterEntidad] = useState<number | undefined>();
  const [filterYear, setFilterYear] = useState<number | undefined>();
  const [filterMes, setFilterMes] = useState<number | undefined>();
  const [busqueda, setBusqueda] = useState("");
  
  // Modal de detalle
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedInstancia, setSelectedInstancia] = useState<InstanciaReporteDTO | null>(null);

  // Años disponibles para filtro
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const meses = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ];

  useEffect(() => {
    cargarEntidades();
  }, []);

  useEffect(() => {
    cargarHistorico();
  }, [filterEntidad, filterYear, filterMes]);

  const cargarEntidades = async () => {
    try {
      const data = await entidadService.listar();
      setEntidades(data.filter(e => e.activo));
    } catch (err) {
      console.error("Error cargando entidades:", err);
    }
  };

  const cargarHistorico = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await instanciaService.listarHistorico({
        entidadId: filterEntidad,
        year: filterYear,
        mes: filterMes,
      });
      setHistorico(data);
    } catch (err) {
      setError("Error al cargar el histórico");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = (instancia: InstanciaReporteDTO) => {
    setSelectedInstancia(instancia);
    openModal();
  };

  const limpiarFiltros = () => {
    setFilterEntidad(undefined);
    setFilterYear(undefined);
    setFilterMes(undefined);
    setBusqueda("");
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "N/A";
    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatFechaHora = (fecha: string | null) => {
    if (!fecha) return "N/A";
    return new Date(fecha).toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDesviacionBadge = (dias: number | null) => {
    if (dias === null) return null;
    
    if (dias < 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {Math.abs(dias)} días antes ✓
        </span>
      );
    }
    if (dias === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          A tiempo ✓
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        {dias} días tarde ⚠
      </span>
    );
  };

  // Filtrar por búsqueda
  const historicoFiltrado = historico.filter(h => {
    if (!busqueda) return true;
    const search = busqueda.toLowerCase();
    return (
      h.reporteNombre.toLowerCase().includes(search) ||
      h.reporteId.toLowerCase().includes(search) ||
      h.entidadNombre.toLowerCase().includes(search) ||
      h.periodoReportado.toLowerCase().includes(search) ||
      (h.enviadoPorNombre && h.enviadoPorNombre.toLowerCase().includes(search))
    );
  });

  return (
    <>
      <PageMeta
        title="Histórico de Reportes"
        description="Consulta el histórico de reportes enviados"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Histórico de Reportes
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Consulta todos los reportes enviados
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {historicoFiltrado.length} registro{historicoFiltrado.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={cargarHistorico}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, código, entidad..."
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>

            {/* Entidad */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Entidad</label>
              <select
                value={filterEntidad || ""}
                onChange={(e) => setFilterEntidad(e.target.value ? Number(e.target.value) : undefined)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Todas</option>
                {entidades.map((e) => (
                  <option key={e.id} value={e.id}>{e.razonSocial}</option>
                ))}
              </select>
            </div>

            {/* Año */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
              <select
                value={filterYear || ""}
                onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : undefined)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Todos</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Mes */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mes</label>
              <select
                value={filterMes || ""}
                onChange={(e) => setFilterMes(e.target.value ? Number(e.target.value) : undefined)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Todos</option>
                {meses.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Limpiar filtros */}
          {(filterEntidad || filterYear || filterMes || busqueda) && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={limpiarFiltros}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Tabla */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          ) : historicoFiltrado.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No se encontraron reportes enviados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reporte
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Periodo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Envío
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cumplimiento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enviado por
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {historicoFiltrado.map((instancia) => (
                    <tr key={instancia.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                            {instancia.reporteNombre}
                          </p>
                          <p className="text-xs text-gray-500">{instancia.reporteId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {instancia.entidadNombre}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {instancia.periodoReportado}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatFecha(instancia.fechaEnvioReal)}
                      </td>
                      <td className="px-4 py-4">
                        {getDesviacionBadge(instancia.diasDesviacion)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {instancia.enviadoPorNombre || "Sistema"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => verDetalle(instancia)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Ver detalle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {instancia.linkReporteFinal && (
                            <a
                              href={instancia.linkReporteFinal}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-green-600 rounded-lg hover:bg-green-50"
                              title="Ver archivo"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Estadísticas */}
        {!loading && historicoFiltrado.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{historicoFiltrado.length}</p>
              <p className="text-xs text-blue-600">Total enviados</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-2xl font-bold text-green-700">
                {historicoFiltrado.filter(h => (h.diasDesviacion || 0) <= 0).length}
              </p>
              <p className="text-xs text-green-600">A tiempo</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-2xl font-bold text-red-700">
                {historicoFiltrado.filter(h => (h.diasDesviacion || 0) > 0).length}
              </p>
              <p className="text-xs text-red-600">Con retraso</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">
                {historicoFiltrado.length > 0 
                  ? Math.round((historicoFiltrado.filter(h => (h.diasDesviacion || 0) <= 0).length / historicoFiltrado.length) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-purple-600">Cumplimiento</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-2xl p-0 overflow-hidden"
      >
        {selectedInstancia && (
          <div>
            {/* Header */}
            <div className="px-6 py-4 bg-green-600">
              <h3 className="text-lg font-semibold text-white">
                Detalle del Reporte Enviado
              </h3>
              <p className="text-sm text-green-100 mt-1">
                {selectedInstancia.reporteNombre}
              </p>
            </div>

            {/* Contenido */}
            <div className="px-6 py-5 space-y-6">
              {/* Info general */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Código</p>
                  <p className="text-sm font-medium text-gray-900">{selectedInstancia.reporteId}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Entidad</p>
                  <p className="text-sm font-medium text-gray-900">{selectedInstancia.entidadNombre}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Periodo</p>
                  <p className="text-sm font-medium text-gray-900">{selectedInstancia.periodoReportado}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Frecuencia</p>
                  <p className="text-sm font-medium text-gray-900">{selectedInstancia.frecuencia}</p>
                </div>
              </div>

              {/* Fechas */}
              <div className="p-4 rounded-lg bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Información de Envío</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Fecha de vencimiento</p>
                    <p className="text-sm font-medium">{formatFecha(selectedInstancia.fechaVencimientoCalculada)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fecha de envío</p>
                    <p className="text-sm font-medium">{formatFechaHora(selectedInstancia.fechaEnvioReal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cumplimiento</p>
                    {getDesviacionBadge(selectedInstancia.diasDesviacion)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Enviado por</p>
                    <p className="text-sm font-medium">{selectedInstancia.enviadoPorNombre || "Sistema"}</p>
                  </div>
                </div>
              </div>

              {/* Responsables */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Responsable Elaboración</p>
                  <p className="text-sm text-gray-900">{selectedInstancia.responsableElaboracion}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Supervisor</p>
                  <p className="text-sm text-gray-900">{selectedInstancia.responsableSupervision}</p>
                </div>
              </div>

              {/* Links */}
              <div className="space-y-3">
                {selectedInstancia.linkReporteFinal && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Archivo del Reporte</p>
                    <a
                      href={selectedInstancia.linkReporteFinal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {selectedInstancia.nombreArchivo || "Ver archivo"}
                    </a>
                  </div>
                )}
                
                {selectedInstancia.linkEvidenciaEnvio && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Evidencia de Envío</p>
                    <a
                      href={selectedInstancia.linkEvidenciaEnvio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Ver evidencia
                    </a>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              {selectedInstancia.observaciones && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Observaciones</p>
                  <p className="text-sm text-gray-700 p-3 bg-yellow-50 rounded-lg">
                    {selectedInstancia.observaciones}
                  </p>
                </div>
              )}

              {/* Base legal */}
              {selectedInstancia.baseLegal && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Base Legal</p>
                  <p className="text-sm text-gray-700">{selectedInstancia.baseLegal}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default HistoricoReportes;
