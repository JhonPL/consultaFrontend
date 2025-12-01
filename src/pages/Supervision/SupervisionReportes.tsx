import { useState, useEffect } from "react";
import instanciaService, { InstanciaReporteDTO } from "../../services/instanciaService";
import { useAuth } from "../../context/AuthContext";
import Pagination, { usePagination } from "../../components/common/Pagination";

export default function SupervisionReportes() {
  const { user } = useAuth();
  const [instancias, setInstancias] = useState<InstanciaReporteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendientes" | "enviados" | "vencidos">("pendientes");
  const [busqueda, setBusqueda] = useState("");

  // Modal de detalle
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInstancia, setSelectedInstancia] = useState<InstanciaReporteDTO | null>(null);
  const [observacionSupervisor, setObservacionSupervisor] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  useEffect(() => {
    cargarInstancias();
  }, [filtroEstado]);

  const cargarInstancias = async () => {
    setLoading(true);
    try {
      let data: InstanciaReporteDTO[] = [];
      
      if (filtroEstado === "pendientes") {
        data = await instanciaService.listarPendientes();
      } else if (filtroEstado === "vencidos") {
        data = await instanciaService.listarVencidos();
      } else if (filtroEstado === "enviados") {
        data = await instanciaService.listarHistorico({});
      } else {
        const [pendientes, historico] = await Promise.all([
          instanciaService.listarPendientes(),
          instanciaService.listarHistorico({}),
        ]);
        data = [...pendientes, ...historico];
      }

      // Filtrar solo los que supervisa este usuario (si no es admin)
      if (user?.role === "supervisor") {
        data = data.filter(i => i.responsableSupervisionId === user.id);
      }

      setInstancias(data);
    } catch (error) {
      console.error("Error cargando instancias:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por busqueda
  const instanciasFiltradas = instancias.filter((i) => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (
      i.reporteNombre?.toLowerCase().includes(term) ||
      i.entidadNombre?.toLowerCase().includes(term) ||
      i.periodoReportado?.toLowerCase().includes(term) ||
      i.responsableElaboracion?.toLowerCase().includes(term)
    );
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

  const abrirModal = (instancia: InstanciaReporteDTO) => {
    setSelectedInstancia(instancia);
    setObservacionSupervisor("");
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setSelectedInstancia(null);
    setObservacionSupervisor("");
  };

  const aprobarReporte = async () => {
    if (!selectedInstancia) return;
    setProcesando(true);
    try {
      await instanciaService.aprobar(selectedInstancia.id, observacionSupervisor);
      setMensaje({ tipo: "success", texto: "Reporte aprobado exitosamente" });
      cerrarModal();
      cargarInstancias();
    } catch (error) {
      setMensaje({ tipo: "error", texto: "Error al aprobar el reporte" });
    } finally {
      setProcesando(false);
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  const rechazarReporte = async () => {
    if (!selectedInstancia || !observacionSupervisor.trim()) {
      setMensaje({ tipo: "error", texto: "Debe ingresar un motivo de rechazo" });
      setTimeout(() => setMensaje(null), 4000);
      return;
    }
    setProcesando(true);
    try {
      await instanciaService.rechazar(selectedInstancia.id, observacionSupervisor);
      setMensaje({ tipo: "success", texto: "Reporte devuelto para corrección" });
      cerrarModal();
      cargarInstancias();
    } catch (error) {
      setMensaje({ tipo: "error", texto: "Error al rechazar el reporte" });
    } finally {
      setProcesando(false);
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getBadgeEstado = (instancia: InstanciaReporteDTO) => {
    if (instancia.enviado) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Enviado
        </span>
      );
    }
    if (instancia.vencido) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Vencido
        </span>
      );
    }
    if (instancia.diasHastaVencimiento !== undefined && instancia.diasHastaVencimiento <= 3) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
          Urgente
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Pendiente
      </span>
    );
  };

  // Estadisticas
  const stats = {
    total: instancias.length,
    pendientes: instancias.filter(i => !i.enviado && !i.vencido).length,
    enviados: instancias.filter(i => i.enviado).length,
    vencidos: instancias.filter(i => i.vencido).length,
  };

  return (
    <div className="p-6">
      {/* Mensaje */}
      {mensaje && (
        <div className={`mb-4 p-4 rounded-lg ${mensaje.tipo === "success" ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400" : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"} border`}>
          {mensaje.texto}
        </div>
      )}

      {/* Estadisticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Enviados</p>
          <p className="text-2xl font-bold text-green-600">{stats.enviados}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(["todos", "pendientes", "enviados", "vencidos"] as const).map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === estado
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {estado.charAt(0).toUpperCase() + estado.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar reporte, entidad, responsable..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-4 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">No hay reportes para mostrar</p>
          </div>
        ) : (
          <>
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedItems.map((instancia) => (
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
                      <td className="px-4 py-3 text-sm">
                        <span className={instancia.vencido ? "text-red-600 font-medium" : "text-gray-600 dark:text-gray-300"}>
                          {formatFecha(instancia.fechaVencimientoCalculada)}
                        </span>
                        {instancia.diasHastaVencimiento !== undefined && !instancia.enviado && (
                          <p className="text-xs text-gray-400">
                            {instancia.diasHastaVencimiento < 0
                              ? `${Math.abs(instancia.diasHastaVencimiento)} días de retraso`
                              : `${instancia.diasHastaVencimiento} días restantes`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getBadgeEstado(instancia)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => abrirModal(instancia)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        )}
      </div>

      {/* Modal de detalle - con overflow correcto */}
      {modalOpen && selectedInstancia && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={cerrarModal}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Detalle del Reporte
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedInstancia.reporteNombre}</p>
              </div>

              {/* Contenido */}
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Entidad</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedInstancia.entidadNombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Periodo</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedInstancia.periodoReportado}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Responsable</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedInstancia.responsableElaboracion}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Vencimiento</p>
                    <p className="font-medium text-gray-800 dark:text-white">{formatFecha(selectedInstancia.fechaVencimientoCalculada)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Estado</p>
                    {getBadgeEstado(selectedInstancia)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Formato</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedInstancia.formatoRequerido || "Libre"}</p>
                  </div>
                </div>

                {/* Archivo/Link */}
                {selectedInstancia.enviado && selectedInstancia.linkReporteFinal && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                      Reporte Enviado
                    </p>
                    <a
                      href={selectedInstancia.linkReporteFinal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm dark:text-blue-400"
                    >
                      Ver archivo adjunto
                    </a>
                    {selectedInstancia.fechaEnvioReal && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Enviado: {new Date(selectedInstancia.fechaEnvioReal).toLocaleString("es-CO")}
                      </p>
                    )}
                  </div>
                )}

                {/* Observaciones del supervisor */}
                {selectedInstancia.enviado && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={observacionSupervisor}
                      onChange={(e) => setObservacionSupervisor(e.target.value)}
                      rows={3}
                      placeholder="Requerido para rechazar..."
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={cerrarModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cerrar
                </button>
                {selectedInstancia.enviado && (
                  <>
                    <button
                      onClick={rechazarReporte}
                      disabled={procesando}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Devolver
                    </button>
                    <button
                      onClick={aprobarReporte}
                      disabled={procesando}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}