import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import instanciaService, { InstanciaReporteDTO } from "../../services/instanciaService";

const GestionInstancias: React.FC = () => {
  const [instancias, setInstancias] = useState<InstanciaReporteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"pendientes" | "vencidos" | "todos">("pendientes");
  
  // Modal de envío
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedInstancia, setSelectedInstancia] = useState<InstanciaReporteDTO | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [linkReporte, setLinkReporte] = useState("");
  const [linkEvidencia, setLinkEvidencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [modoEnvio, setModoEnvio] = useState<"archivo" | "link">("archivo");
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [filtro]);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: InstanciaReporteDTO[];
      switch (filtro) {
        case "pendientes":
          data = await instanciaService.listarPendientes();
          break;
        case "vencidos":
          data = await instanciaService.listarVencidos();
          break;
        default:
          data = await instanciaService.listar();
          data = data.filter(i => !i.enviado);
      }
      setInstancias(data);
    } catch (err) {
      setError("Error al cargar las instancias");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalEnvio = (instancia: InstanciaReporteDTO) => {
    setSelectedInstancia(instancia);
    setArchivo(null);
    setLinkReporte("");
    setLinkEvidencia("");
    setObservaciones("");
    setModoEnvio("archivo");
    openModal();
  };

  const handleEnviar = async () => {
    if (!selectedInstancia) return;
    
    if (modoEnvio === "archivo" && !archivo) {
      alert("Debe seleccionar un archivo");
      return;
    }
    
    if (modoEnvio === "link" && !linkReporte) {
      alert("Debe ingresar el link del reporte");
      return;
    }

    setEnviando(true);
    try {
      if (modoEnvio === "archivo" && archivo) {
        await instanciaService.enviarReporte(
          selectedInstancia.id,
          archivo,
          observaciones || undefined,
          linkEvidencia || undefined
        );
      } else {
        await instanciaService.enviarReporteConLink(
          selectedInstancia.id,
          linkReporte,
          observaciones || undefined,
          linkEvidencia || undefined
        );
      }
      
      setMensajeExito(`Reporte "${selectedInstancia.reporteNombre}" enviado exitosamente`);
      closeModal();
      cargarDatos();
      
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { mensaje?: string } } };
      alert(error.response?.data?.mensaje || "Error al enviar el reporte");
    } finally {
      setEnviando(false);
    }
  };

  const getPrioridadBadge = (prioridad: string, dias: number) => {
    if (prioridad === "CRITICA" || dias < 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          {dias < 0 ? `Vencido (${Math.abs(dias)}d)` : "Crítico"}
        </span>
      );
    }
    if (prioridad === "ALTA" || dias <= 3) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Urgente ({dias}d)
        </span>
      );
    }
    if (prioridad === "MEDIA" || dias <= 7) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Próximo ({dias}d)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        A tiempo ({dias}d)
      </span>
    );
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <PageMeta
        title="Gestión de Instancias"
        description="Gestión y envío de reportes"
      />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Gestión de Reportes
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Envía y gestiona las instancias de reportes pendientes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as "pendientes" | "vencidos" | "todos")}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="pendientes">Pendientes</option>
              <option value="vencidos">Vencidos</option>
              <option value="todos">Todos sin enviar</option>
            </select>

            <button
              onClick={cargarDatos}
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

        {/* Mensaje de éxito */}
        {mensajeExito && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-700 dark:text-green-400">{mensajeExito}</p>
            </div>
          </div>
        )}

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
          ) : instancias.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                {filtro === "vencidos" ? "¡No hay reportes vencidos!" : "No hay reportes pendientes"}
              </p>
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
                      Vencimiento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Formato
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {instancias.map((instancia) => (
                    <tr 
                      key={instancia.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        instancia.vencido ? "bg-red-50 dark:bg-red-900/10" : ""
                      }`}
                    >
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
                        {formatFecha(instancia.fechaVencimientoCalculada)}
                      </td>
                      <td className="px-4 py-4">
                        {getPrioridadBadge(instancia.prioridad, instancia.diasHastaVencimiento)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {instancia.formatoRequerido || "N/A"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => abrirModalEnvio(instancia)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Enviar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumen */}
        {!loading && instancias.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-2xl font-bold text-red-700">
                {instancias.filter(i => i.diasHastaVencimiento < 0).length}
              </p>
              <p className="text-xs text-red-600">Vencidos</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-2xl font-bold text-orange-700">
                {instancias.filter(i => i.diasHastaVencimiento >= 0 && i.diasHastaVencimiento <= 7).length}
              </p>
              <p className="text-xs text-orange-600">Próximos 7 días</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">
                {instancias.length}
              </p>
              <p className="text-xs text-blue-600">Total pendientes</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Envío */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-lg p-0 overflow-hidden"
      >
        {selectedInstancia && (
          <div>
            {/* Header */}
            <div className="px-6 py-4 bg-blue-600">
              <h3 className="text-lg font-semibold text-white">
                Enviar Reporte
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                {selectedInstancia.reporteNombre} - {selectedInstancia.periodoReportado}
              </p>
            </div>

            {/* Contenido */}
            <div className="px-6 py-5 space-y-4">
              {/* Info del reporte */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Entidad:</span>
                    <span className="ml-2 font-medium">{selectedInstancia.entidadNombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Formato:</span>
                    <span className="ml-2 font-medium">{selectedInstancia.formatoRequerido || "Libre"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Vencimiento:</span>
                    <span className="ml-2 font-medium">{formatFecha(selectedInstancia.fechaVencimientoCalculada)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Responsable:</span>
                    <span className="ml-2 font-medium">{selectedInstancia.responsableElaboracion}</span>
                  </div>
                </div>
              </div>

              {/* Selector de modo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Método de envío
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="modoEnvio"
                      value="archivo"
                      checked={modoEnvio === "archivo"}
                      onChange={() => setModoEnvio("archivo")}
                      className="mr-2"
                    />
                    <span className="text-sm">Subir archivo</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="modoEnvio"
                      value="link"
                      checked={modoEnvio === "link"}
                      onChange={() => setModoEnvio("link")}
                      className="mr-2"
                    />
                    <span className="text-sm">Ingresar link</span>
                  </label>
                </div>
              </div>

              {/* Input según modo */}
              {modoEnvio === "archivo" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Archivo del reporte *
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.csv"
                    className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {archivo && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ {archivo.name} ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Link del reporte (Google Drive, OneDrive, etc.) *
                  </label>
                  <input
                    type="url"
                    value={linkReporte}
                    onChange={(e) => setLinkReporte(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Link de evidencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link de evidencia de envío (opcional)
                </label>
                <input
                  type="url"
                  value={linkEvidencia}
                  onChange={(e) => setLinkEvidencia(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Ej: Captura de pantalla del correo de envío, confirmación del sistema, etc.
                </p>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  placeholder="Notas adicionales sobre el envío..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={enviando}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviar}
                disabled={enviando || (modoEnvio === "archivo" && !archivo) || (modoEnvio === "link" && !linkReporte)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {enviando ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirmar envío
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default GestionInstancias;