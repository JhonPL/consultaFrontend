import { useState, useEffect } from "react";
import instanciaService, { InstanciaReporteDTO } from "../../services/instanciaService";
import { useAuth } from "../../context/AuthContext";
import Pagination, { usePagination } from "../../components/common/Pagination";

export default function MisReportes() {
  const { user } = useAuth();
  const [instancias, setInstancias] = useState<InstanciaReporteDTO[]>([]);
  const [todasMisInstancias, setTodasMisInstancias] = useState<InstanciaReporteDTO[]>([]);

  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<"pendientes" | "enviados" | "vencidos">("pendientes");
  const [busqueda, setBusqueda] = useState("");

  // Modal de envio
  const [modalEnvio, setModalEnvio] = useState(false);
  const [selectedInstancia, setSelectedInstancia] = useState<InstanciaReporteDTO | null>(null);
  const [modoEnvio, setModoEnvio] = useState<"archivo" | "link">("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [linkReporte, setLinkReporte] = useState("");
  const [linkEvidencia, setLinkEvidencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  // Filtros por fecha
  const [filtroFecha, setFiltroFecha] = useState<"mes" | "mes_pasado" | "tres_meses" | "anio" | "rango" | "todos">("todos");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");




  useEffect(() => {
    cargarMisReportes();
  }, [filtroEstado, user]);

  useEffect(() => {
    cargarTodasMisInstancias();
  }, [user]);


  const cargarMisReportes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let data: InstanciaReporteDTO[] = [];

      if (filtroEstado === "pendientes") {
        data = await instanciaService.listarPendientes();
      } else if (filtroEstado === "vencidos") {
        data = await instanciaService.listarVencidos();
      } else {
        data = await instanciaService.listarHistorico({});
      }

      // Filtrar solo los reportes asignados a este usuario
      data = data.filter(i => i.responsableElaboracionId === user.id);

      setInstancias(data);
    } catch (error) {
      console.error("Error cargando reportes:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarTodasMisInstancias = async () => {
    if (!user) return;

    try {
      const historico = await instanciaService.listarHistorico({});
      const pendientes = await instanciaService.listarPendientes();
      const vencidos = await instanciaService.listarVencidos();

      // unir sin duplicados por id
      const all = [...historico, ...pendientes, ...vencidos].filter(
        (v, idx, arr) => arr.findIndex(t => t.id === v.id) === idx
      );

      // Solo las del usuario
      const propios = all.filter(i => i.responsableElaboracionId === user.id);

      setTodasMisInstancias(propios);

    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  };

  const filtrarPorPeriodo = (lista: InstanciaReporteDTO[]) => {
    const hoy = new Date();

    const getDate = (fecha: string) => new Date(fecha + "T00:00:00");

    switch (filtroFecha) {
      case "mes": {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        return lista.filter(i =>
          i.fechaEnvioReal && getDate(i.fechaEnvioReal) >= inicio && getDate(i.fechaEnvioReal) <= fin
        );
      }

      case "mes_pasado": {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        return lista.filter(i =>
          i.fechaEnvioReal && getDate(i.fechaEnvioReal) >= inicio && getDate(i.fechaEnvioReal) <= fin
        );
      }

      case "tres_meses": {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
        return lista.filter(i =>
          i.fechaEnvioReal && getDate(i.fechaEnvioReal) >= inicio
        );
      }

      case "anio": {
        const inicio = new Date(hoy.getFullYear(), 0, 1);
        return lista.filter(i =>
          i.fechaEnvioReal && getDate(i.fechaEnvioReal) >= inicio
        );
      }

      case "rango": {
        if (!fechaInicio || !fechaFin) return lista;
        const inicio = new Date(fechaInicio + "T00:00:00");
        const fin = new Date(fechaFin + "T23:59:59");
        return lista.filter(i =>
          i.fechaEnvioReal && getDate(i.fechaEnvioReal) >= inicio && getDate(i.fechaEnvioReal) <= fin
        );
      }

      default:
        return lista;
    }
  };



  // Filtrar por busqueda
  const instanciasFiltradas = filtrarPorPeriodo(instancias).filter((i) => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (
      i.reporteNombre?.toLowerCase().includes(term) ||
      i.entidadNombre?.toLowerCase().includes(term) ||
      i.periodoReportado?.toLowerCase().includes(term)
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

  const abrirModalEnvio = (instancia: InstanciaReporteDTO) => {
    setSelectedInstancia(instancia);
    setArchivo(null);
    setLinkReporte("");
    setLinkEvidencia("");
    setObservaciones("");
    setModoEnvio("archivo");
    setModalEnvio(true);
  };

  const cerrarModalEnvio = () => {
    setModalEnvio(false);
    setSelectedInstancia(null);
  };

  const handleEnviar = async () => {
    if (!selectedInstancia) return;

    if (modoEnvio === "archivo" && !archivo) {
      setMensaje({ tipo: "error", texto: "Debe seleccionar un archivo" });
      return;
    }
    if (modoEnvio === "link" && !linkReporte?.trim()) {
      setMensaje({ tipo: "error", texto: "Debe ingresar el link del reporte" });
      return;
    }

    setEnviando(true);
    try {
      if (modoEnvio === "archivo" && archivo) {
        try {
          console.log('[DEBUG] enviar archivo instanciaId=', selectedInstancia.id, 'archivo=', archivo.name);
        } catch { }

        await instanciaService.enviarReporte(
          selectedInstancia.id,
          archivo,
          observaciones?.trim() || undefined,
          linkEvidencia?.trim() || undefined
        );
      } else {
        // Normalizar URL: auto-agregar https:// si falta
        let urlNormalizada = linkReporte.trim();
        if (!urlNormalizada.startsWith('http://') && !urlNormalizada.startsWith('https://')) {
          urlNormalizada = 'https://' + urlNormalizada;
        }

        // Validar formato de URL
        try {
          const parsed = new URL(urlNormalizada);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Protocolo no soportado');
          }
        } catch (err) {
          setMensaje({
            tipo: 'error',
            texto: 'Link inválido. Debe ser una URL válida (ej: drive.google.com/file/...)'
          });
          setEnviando(false);
          setTimeout(() => setMensaje(null), 4000);
          return;
        }

        // Normalizar link de evidencia también
        let urlEvidenciaNormalizada = linkEvidencia?.trim();
        if (urlEvidenciaNormalizada &&
          !urlEvidenciaNormalizada.startsWith('http://') &&
          !urlEvidenciaNormalizada.startsWith('https://')) {
          urlEvidenciaNormalizada = 'https://' + urlEvidenciaNormalizada;
        }

        try {
          console.log('[DEBUG] enviar link normalizado=', {
            instanciaId: selectedInstancia.id,
            linkReporte: urlNormalizada,
            linkEvidencia: urlEvidenciaNormalizada
          });
        } catch { }

        await instanciaService.enviarReporteConLink(
          selectedInstancia.id,
          urlNormalizada,
          observaciones?.trim() || undefined,
          urlEvidenciaNormalizada || undefined
        );
      }

      setMensaje({
        tipo: "success",
        texto: `Reporte "${selectedInstancia.reporteNombre}" enviado exitosamente`
      });
      cerrarModalEnvio();
      cargarMisReportes();

    } catch (error: unknown) {
      console.error('Error enviar reporte:', error);
      const err = error as { response?: { data?: any } };
      const serverMsg = err?.response?.data?.mensaje ||
        err?.response?.data?.message ||
        err?.response?.data;
      const texto = typeof serverMsg === 'string'
        ? serverMsg
        : (serverMsg ? JSON.stringify(serverMsg) : 'Error al enviar el reporte');
      setMensaje({ tipo: "error", texto });
    } finally {
      setEnviando(false);
      setTimeout(() => setMensaje(null), 5000);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPrioridadBadge = (instancia: InstanciaReporteDTO) => {
    if (instancia.vencido) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          VENCIDO
        </span>
      );
    }

    const dias = instancia.diasHastaVencimiento;
    if (dias !== undefined) {
      if (dias <= 1) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            URGENTE
          </span>
        );
      }
      if (dias <= 7) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            {dias} días
          </span>
        );
      }
    }

    return null;
  };

  // Estadisticas personales
  const instanciasFiltradasPorFecha = filtrarPorPeriodo(todasMisInstancias);

  const stats = {
    pendientes: instanciasFiltradasPorFecha.filter(i => !i.enviado && !i.vencido).length,
    vencidos: instanciasFiltradasPorFecha.filter(i => i.vencido).length,
    enviados: instanciasFiltradasPorFecha.filter(i => i.enviado).length,
    urgentes: instanciasFiltradasPorFecha.filter(
      i => !i.enviado && i.diasHastaVencimiento !== undefined && i.diasHastaVencimiento <= 3
    ).length,
  };


  return (
    <div className="p-6">
      {/* Mensaje */}
      {mensaje && (
        <div className={`mb-4 p-4 rounded-lg ${mensaje.tipo === "success" ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400" : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"} border`}>
          {mensaje.texto}
        </div>
      )}

      {/* Resumen personal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.pendientes}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.urgentes}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Urgentes</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Vencidos</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.enviados}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enviados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y busqueda */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          {(["pendientes", "vencidos", "enviados"] as const).map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroEstado === estado
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
            placeholder="Buscar por reporte, entidad, periodo..."
            value={busqueda ?? ""}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-4 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* FILTRO POR PERIODO */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 mt-2">
        <select
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value as any)}
          className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="todos">Todos los periodos</option>
          <option value="mes">Este mes</option>
          <option value="mes_pasado">Mes pasado</option>
          <option value="tres_meses">Últimos 3 meses</option>
          <option value="anio">Año actual</option>
          <option value="rango">Rango personalizado</option>
        </select>

        {filtroFecha === "rango" && (
          <div className="flex gap-2">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm"
            />
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm"
            />
          </div>
        )}
      </div>


      {/* Lista de reportes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">No hay reportes {filtroEstado}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedItems.map((instancia) => (
                <div
                  key={instancia.id}
                  className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${instancia.vencido ? "bg-red-100 dark:bg-red-900/30" : instancia.enviado ? "bg-green-100 dark:bg-green-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                          {instancia.enviado ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                            {instancia.reporteNombre}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {instancia.entidadNombre} • {instancia.periodoReportado}
                          </p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-gray-400">
                              Vence: {formatFecha(instancia.fechaVencimientoCalculada)}
                            </span>
                            {!instancia.enviado && getPrioridadBadge(instancia)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {instancia.enviado ? (
                        <>
                          {/* ESTADO DETALLADO SEGÚN estadoNombre */}
                          {instancia.estadoNombre === "Enviado tarde" ? (
                            <span className="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg dark:bg-orange-900/30 dark:text-orange-400">
                              Enviado tarde
                            </span>
                          ) : instancia.estadoNombre === "Enviado a tiempo" ? (
                            <span className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg dark:bg-green-900/30 dark:text-green-400">
                              Enviado a tiempo
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg dark:bg-green-900/30 dark:text-green-400">
                              {instancia.estadoNombre}
                            </span>
                          )}

                          {/* Link archivo */}
                          {instancia.linkReporteFinal && (
                            <a
                              href={instancia.linkReporteFinal}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              Ver archivo
                            </a>
                          )}
                        </>
                      ) : (

                        <button
                          onClick={() => abrirModalEnvio(instancia)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Enviar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
          </>
        )}
      </div>

      {/* Modal de envio - Corregido para modo oscuro y sin scroll */}
      {modalEnvio && selectedInstancia && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={cerrarModalEnvio}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full">
              {/* Header */}
              <div className="px-6 py-4 bg-blue-600 rounded-t-2xl">
                <h3 className="text-lg font-semibold text-white">Enviar Reporte</h3>
                <p className="text-sm text-blue-100">{selectedInstancia.reporteNombre}</p>
              </div>

              {/* Contenido */}
              <div className="px-6 py-5 space-y-4">
                {/* Info del reporte */}
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Entidad:</span>
                      <span className="ml-1 font-medium text-gray-800 dark:text-white">{selectedInstancia.entidadNombre}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Periodo:</span>
                      <span className="ml-1 font-medium text-gray-800 dark:text-white">{selectedInstancia.periodoReportado}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Formato:</span>
                      <span className="ml-1 font-medium text-gray-800 dark:text-white">{selectedInstancia.formatoRequerido || "Libre"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Vencimiento:</span>
                      <span className={`ml-1 font-medium ${selectedInstancia.vencido ? "text-red-600" : "text-gray-800 dark:text-white"}`}>
                        {formatFecha(selectedInstancia.fechaVencimientoCalculada)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modo de envio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Método de envío
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={modoEnvio === "archivo"}
                        onChange={() => setModoEnvio("archivo")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Subir archivo</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={modoEnvio === "link"}
                        onChange={() => setModoEnvio("link")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ingresar link</span>
                    </label>
                  </div>
                </div>

                {/* Input segun modo */}
                {modoEnvio === "archivo" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Archivo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.csv"
                      className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                    />
                    {archivo && (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400">Seleccionado: {archivo.name}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Link del reporte <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={linkReporte ?? ""}
                      onChange={(e) => setLinkReporte(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                )}

                {/* Link evidencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Link de evidencia (opcional)
                  </label>
                  <input
                    type="url"
                    value={linkEvidencia ?? ""}
                    onChange={(e) => setLinkEvidencia(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    value={observaciones ?? ""}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={2}
                    placeholder="Notas adicionales..."
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={cerrarModalEnvio}
                  disabled={enviando}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviar}
                  disabled={enviando || (modoEnvio === "archivo" && !archivo) || (modoEnvio === "link" && !linkReporte)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
                    "Enviar Reporte"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}