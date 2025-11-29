import { useState, useEffect } from "react";
import reporteService, { Reporte, ReporteRequest } from "../../../services/reporteService";
import entidadService, { Entidad } from "../../../services/entidadService";
import frecuenciaService, { Frecuencia } from "../../../services/frecuenciaService";
import usuarioService, { Usuario } from "../../../services/usuarioService";
import instanciaService, { InstanciaReporteDTO } from "../../../services/instanciaService";

export default function TableReportes() {
  // Estados principales
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [frecuencias, setFrecuencias] = useState<Frecuencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [responsables, setResponsables] = useState<Usuario[]>([]);
  const [supervisores, setSupervisores] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del modal de edición
  const [isOpen, setIsOpen] = useState(false);
  const [isNewReporte, setIsNewReporte] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados del modal de confirmación
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "edit" | "delete" | "send" | null;
    reporte: Reporte | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    reporte: null,
    title: "",
    message: "",
  });

  // Estados del modal de envío
  const [sendModal, setSendModal] = useState(false);
  const [selectedReporteForSend, setSelectedReporteForSend] = useState<Reporte | null>(null);
  const [instanciasPendientes, setInstanciasPendientes] = useState<InstanciaReporteDTO[]>([]);
  const [selectedInstancia, setSelectedInstancia] = useState<InstanciaReporteDTO | null>(null);
  const [loadingInstancias, setLoadingInstancias] = useState(false);
  const [modoEnvio, setModoEnvio] = useState<"archivo" | "link">("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [linkReporte, setLinkReporte] = useState("");
  const [linkEvidencia, setLinkEvidencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Mensaje de éxito
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    id: "",
    nombre: "",
    entidadId: 0,
    baseLegal: "",
    fechaInicioVigencia: "",
    fechaFinVigencia: "",
    frecuenciaId: 0,
    diaVencimiento: 1,
    mesVencimiento: 1,
    plazoAdicionalDias: 0,
    formatoRequerido: "",
    linkInstrucciones: "",
    responsableElaboracionId: 0,
    responsableSupervisionId: 0,
    activo: true,
  });

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEntidad, setFilterEntidad] = useState("Todos");
  const [filterFrecuencia, setFilterFrecuencia] = useState("Todos");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);

  // Dropdown de acciones
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Cargar datos al iniciar
  useEffect(() => {
    cargarDatos();
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportesData, entidadesData, frecuenciasData, usuariosData] = await Promise.all([
        reporteService.listar(),
        entidadService.listar(),
        frecuenciaService.listar(),
        usuarioService.listar(),
      ]);
      setReportes(reportesData);
      setEntidades(entidadesData.filter(e => e.activo));
      setFrecuencias(frecuenciasData);
      setUsuarios(usuariosData.filter(u => u.activo));

      const usuariosActivos = usuariosData.filter(u => u.activo);
      setResponsables(usuariosActivos.filter(u =>
        u.rol?.nombre?.toUpperCase().includes('RESPONSABLE')
      ));
      setSupervisores(usuariosActivos.filter(u =>
        u.rol?.nombre?.toUpperCase().includes('SUPERVISOR')
      ));
    } catch (err: unknown) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos. Verifique que el backend esté ejecutándose.");
    } finally {
      setLoading(false);
    }
  };

  // ============ FUNCIONES DE CONFIRMACIÓN ============

  const openConfirmModal = (type: "edit" | "delete" | "send", reporte: Reporte) => {
    const configs = {
      edit: {
        title: "Confirmar edición",
        message: `¿Está seguro que desea editar el reporte "${reporte.nombre}"?`,
      },
      delete: {
        title: "Confirmar eliminación",
        message: `¿Está seguro que desea eliminar el reporte "${reporte.nombre}"? Esta acción puede afectar las instancias asociadas y no se puede deshacer.`,
      },
      send: {
        title: "Enviar reporte",
        message: `¿Desea enviar una instancia del reporte "${reporte.nombre}"?`,
      },
    };

    setConfirmModal({
      isOpen: true,
      type,
      reporte,
      title: configs[type].title,
      message: configs[type].message,
    });
    setOpenDropdown(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.reporte || !confirmModal.type) return;

    switch (confirmModal.type) {
      case "edit":
        proceedToEdit(confirmModal.reporte);
        break;
      case "delete":
        await proceedToDelete(confirmModal.reporte.id!);
        break;
      case "send":
        await proceedToSend(confirmModal.reporte);
        break;
    }

    setConfirmModal({ isOpen: false, type: null, reporte: null, title: "", message: "" });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, reporte: null, title: "", message: "" });
  };

  // ============ FUNCIONES DE EDICIÓN ============

  const proceedToEdit = (reporte: Reporte) => {
    setFormData({
      id: reporte.id || "",
      nombre: reporte.nombre,
      entidadId: reporte.entidad?.id || 0,
      baseLegal: reporte.baseLegal || "",
      fechaInicioVigencia: reporte.fechaInicioVigencia || "",
      fechaFinVigencia: reporte.fechaFinVigencia || "",
      frecuenciaId: reporte.frecuencia?.id || 0,
      diaVencimiento: reporte.diaVencimiento || 1,
      mesVencimiento: reporte.mesVencimiento || 1,
      plazoAdicionalDias: reporte.plazoAdicionalDias || 0,
      formatoRequerido: reporte.formatoRequerido || "",
      linkInstrucciones: reporte.linkInstrucciones || "",
      responsableElaboracionId: reporte.responsableElaboracion?.id || 0,
      responsableSupervisionId: reporte.responsableSupervision?.id || 0,
      activo: reporte.activo,
    });
    setIsNewReporte(false);
    setIsOpen(true);
  };

  const openNewModal = () => {
    setFormData({
      id: "",
      nombre: "",
      entidadId: entidades.length > 0 ? entidades[0].id! : 0,
      baseLegal: "",
      fechaInicioVigencia: "",
      fechaFinVigencia: "",
      frecuenciaId: frecuencias.length > 0 ? frecuencias[0].id : 0,
      diaVencimiento: 1,
      mesVencimiento: 1,
      plazoAdicionalDias: 0,
      formatoRequerido: "",
      linkInstrucciones: "",
      responsableElaboracionId: responsables.length > 0 ? responsables[0].id! : 0,
      responsableSupervisionId: supervisores.length > 0 ? supervisores[0].id! : 0,
      activo: true,
    });
    setIsNewReporte(true);
    setIsOpen(true);
  };

  // ============ FUNCIONES DE ELIMINACIÓN ============

  const proceedToDelete = async (id: string) => {
    try {
      await reporteService.eliminar(id);
      setReportes((prev) => prev.filter((r) => r.id !== id));
      setMensajeExito("Reporte eliminado exitosamente");
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err: unknown) {
      console.error("Error eliminando reporte:", err);
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || "Error al eliminar el reporte.");
    }
  };

  // ============ FUNCIONES DE ENVÍO ============

  const proceedToSend = async (reporte: Reporte) => {
    setSelectedReporteForSend(reporte);
    setLoadingInstancias(true);
    setSendModal(true);

    try {
      const todasInstancias = await instanciaService.listarPendientes();
      const instanciasDelReporte = todasInstancias.filter(
        (i) => i.reporteId === reporte.id
      );
      setInstanciasPendientes(instanciasDelReporte);

      if (instanciasDelReporte.length > 0) {
        setSelectedInstancia(instanciasDelReporte[0]);
      }
    } catch (err) {
      console.error("Error cargando instancias:", err);
      setInstanciasPendientes([]);
    } finally {
      setLoadingInstancias(false);
    }
  };

  const closeSendModal = () => {
    setSendModal(false);
    setSelectedReporteForSend(null);
    setSelectedInstancia(null);
    setInstanciasPendientes([]);
    setArchivo(null);
    setLinkReporte("");
    setLinkEvidencia("");
    setObservaciones("");
    setModoEnvio("archivo");
  };

  const handleEnviar = async () => {
    if (!selectedInstancia) {
      alert("Debe seleccionar una instancia para enviar");
      return;
    }

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

      setMensajeExito(`Reporte "${selectedReporteForSend?.nombre}" - Periodo ${selectedInstancia.periodoReportado} enviado exitosamente`);
      closeSendModal();
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { mensaje?: string } } };
      alert(error.response?.data?.mensaje || "Error al enviar el reporte");
    } finally {
      setEnviando(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ============ GUARDAR REPORTE ============

  const closeModal = () => {
    setIsOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const reporteRequest: ReporteRequest = {
        id: formData.id || undefined,
        nombre: formData.nombre,
        entidad: { id: formData.entidadId },
        baseLegal: formData.baseLegal || undefined,
        fechaInicioVigencia: formData.fechaInicioVigencia || undefined,
        fechaFinVigencia: formData.fechaFinVigencia || undefined,
        frecuencia: { id: formData.frecuenciaId },
        diaVencimiento: formData.diaVencimiento,
        mesVencimiento: formData.mesVencimiento,
        plazoAdicionalDias: formData.plazoAdicionalDias,
        formatoRequerido: formData.formatoRequerido || undefined,
        linkInstrucciones: formData.linkInstrucciones || undefined,
        responsableElaboracion: { id: formData.responsableElaboracionId },
        responsableSupervision: { id: formData.responsableSupervisionId },
        activo: formData.activo,
      };

      if (isNewReporte) {
        if (!formData.id) {
          alert("El código del reporte es obligatorio");
          setSaving(false);
          return;
        }
        const nuevoReporte = await reporteService.crear(reporteRequest);
        setReportes((prev) => [...prev, nuevoReporte]);
        setMensajeExito("Reporte creado exitosamente");
      } else {
        const reporteActualizado = await reporteService.actualizar(formData.id, reporteRequest);
        setReportes((prev) =>
          prev.map((r) => (r.id === formData.id ? reporteActualizado : r))
        );
        setMensajeExito("Reporte actualizado exitosamente");
      }
      closeModal();
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err: unknown) {
      console.error("Error guardando reporte:", err);
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || "Error al guardar el reporte");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterEntidad("Todos");
    setFilterFrecuencia("Todos");
    setFilterEstado("Todos");
  };

  const filteredReportes = reportes.filter((r) => {
    const matchSearch =
      r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchEntidad = filterEntidad === "Todos" || r.entidad?.razonSocial === filterEntidad;
    const matchFrecuencia = filterFrecuencia === "Todos" || r.frecuencia?.nombre === filterFrecuencia;
    const matchEstado =
      filterEstado === "Todos" ||
      (filterEstado === "Activo" && r.activo) ||
      (filterEstado === "Inactivo" && !r.activo);

    return matchSearch && matchEntidad && matchFrecuencia && matchEstado;
  });

  // ============ HELPERS DE FRECUENCIA ============

  const meses = [
    { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
    { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
  ];

  const mesesTrimestre = [
    { value: 1, label: "Mes 1 del trimestre" },
    { value: 2, label: "Mes 2 del trimestre" },
    { value: 3, label: "Mes 3 del trimestre" },
  ];

  const mesesSemestre = [
    { value: 1, label: "Mes 1 del semestre" }, { value: 2, label: "Mes 2 del semestre" },
    { value: 3, label: "Mes 3 del semestre" }, { value: 4, label: "Mes 4 del semestre" },
    { value: 5, label: "Mes 5 del semestre" }, { value: 6, label: "Mes 6 del semestre" },
  ];

  const getFrecuenciaNombre = (frecuenciaId: number): string => {
    const frecuencia = frecuencias.find(f => f.id === frecuenciaId);
    return frecuencia?.nombre?.toUpperCase() || "";
  };

  const getMesLabel = (frecuenciaId: number): React.ReactNode => {
    const nombre = getFrecuenciaNombre(frecuenciaId);
    if (nombre.includes("TRIMESTRAL")) return (<>Mes del Trimestre <span className="text-red-500">*</span></>);
    if (nombre.includes("SEMESTRAL")) return (<>Mes del Semestre <span className="text-red-500">*</span></>);
    if (nombre.includes("ANUAL")) return (<>Mes del Año <span className="text-red-500">*</span></>);
    return "Mes de Entrega";
  };

  const getMesesPorFrecuencia = (frecuenciaId: number) => {
    const nombre = getFrecuenciaNombre(frecuenciaId);
    if (nombre.includes("TRIMESTRAL")) return mesesTrimestre;
    if (nombre.includes("SEMESTRAL")) return mesesSemestre;
    return meses;
  };

  const getVencimientoPreview = (): string => {
    const nombre = getFrecuenciaNombre(formData.frecuenciaId);
    const dia = formData.diaVencimiento;
    const mes = formData.mesVencimiento;

    if (nombre.includes("MENSUAL")) return `Este reporte vence el día ${dia} de cada mes.`;
    if (nombre.includes("ANUAL")) return `Vence el ${dia} de ${meses[mes - 1]?.label} cada año.`;
    if (nombre.includes("DIARIO")) return `Este reporte vence todos los días.`;
    if (nombre.includes("SEMANAL")) return `Este reporte vence cada semana.`;
    return "Seleccione una frecuencia para ver el calendario de vencimiento.";
  };

  // ============ RENDER ============

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando reportes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm dark:border-red-800 dark:bg-red-900/20">
        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={cargarDatos} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Mensaje de éxito */}
      {mensajeExito && (
        <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-700 dark:text-green-400">{mensajeExito}</p>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Gestión de Reportes</h3>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowFilters(!showFilters)} className="text-sm inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              Filtros
            </button>
            <button onClick={cargarDatos} className="text-sm inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" title="Recargar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={openNewModal} className="text-sm inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700">
              + Nuevo Reporte
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex flex-col gap-3">
              <input type="text" placeholder="Buscar por código o nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-[42px] w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select value={filterEntidad} onChange={(e) => setFilterEntidad(e.target.value)} className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                  <option value="Todos">Todas las entidades</option>
                  {entidades.map((e) => (<option key={e.id} value={e.razonSocial}>{e.razonSocial}</option>))}
                </select>
                <select value={filterFrecuencia} onChange={(e) => setFilterFrecuencia(e.target.value)} className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                  <option value="Todos">Todas las frecuencias</option>
                  {frecuencias.map((f) => (<option key={f.id} value={f.nombre}>{f.nombre}</option>))}
                </select>
                <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                  <option value="Todos">Todos los estados</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
                <button onClick={clearFilters} className="h-11 px-4 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400">Limpiar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Código</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Nombre</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Entidad</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Frecuencia</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Responsable</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Estado</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredReportes.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">No se encontraron reportes</td></tr>
            ) : (
              filteredReportes.map((reporte) => (
                <tr key={reporte.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-mono text-xs">{reporte.id}</td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200 max-w-[200px] truncate">{reporte.nombre}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                      {reporte.entidad?.razonSocial || "Sin entidad"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {reporte.frecuencia?.nombre || "Sin frecuencia"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm truncate max-w-[120px]">
                    {reporte.responsableElaboracion?.nombreCompleto || "-"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${reporte.activo ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                      {reporte.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right relative">
                    <button onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === reporte.id ? null : reporte.id!); }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>

                    {openDropdown === reporte.id && (
                      <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                        <button onClick={() => openConfirmModal("edit", reporte)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Editar
                        </button>
                        <button onClick={() => openConfirmModal("send", reporte)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Enviar
                        </button>
                        <hr className="my-1 border-gray-200 dark:border-gray-700" />
                        <button onClick={() => openConfirmModal("delete", reporte)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-5 z-[99999]">
          <div onClick={closeConfirmModal} className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"></div>
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900 shadow-xl">
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${confirmModal.type === "delete" ? "bg-red-100" : confirmModal.type === "send" ? "bg-blue-100" : "bg-yellow-100"}`}>
                {confirmModal.type === "delete" ? (
                  <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                ) : confirmModal.type === "send" ? (
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                ) : (
                  <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                )}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">{confirmModal.title}</h3>
              <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{confirmModal.message}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={closeConfirmModal} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">Cancelar</button>
                <button onClick={handleConfirmAction} className={`px-4 py-2.5 text-sm font-medium text-white rounded-lg ${confirmModal.type === "delete" ? "bg-red-600 hover:bg-red-700" : confirmModal.type === "send" ? "bg-blue-600 hover:bg-blue-700" : "bg-yellow-600 hover:bg-yellow-700"}`}>
                  {confirmModal.type === "delete" ? "Sí, eliminar" : confirmModal.type === "send" ? "Continuar" : "Sí, editar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ENVÍO */}
      {sendModal && (
        <div className="fixed inset-0 flex items-center justify-center p-5 overflow-y-auto z-[99999]">
          <div onClick={closeSendModal} className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"></div>
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-gray-900 shadow-xl z-50 overflow-hidden">
            <div className="px-6 py-4 bg-blue-600">
              <h3 className="text-lg font-semibold text-white">Enviar Reporte</h3>
              <p className="text-sm text-blue-100 mt-1">{selectedReporteForSend?.nombre}</p>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {loadingInstancias ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                </div>
              ) : instanciasPendientes.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No hay instancias pendientes para este reporte</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seleccionar periodo <span className="text-red-500">*</span></label>
                    <select value={selectedInstancia?.id || ""} onChange={(e) => { const inst = instanciasPendientes.find(i => i.id === Number(e.target.value)); setSelectedInstancia(inst || null); }} className="w-full h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                      {instanciasPendientes.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.periodoReportado} - Vence: {formatFecha(inst.fechaVencimientoCalculada)}{inst.vencido ? " (VENCIDO)" : ""}</option>
                      ))}
                    </select>
                  </div>

                  {selectedInstancia && (
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Entidad:</span><span className="ml-2 font-medium">{selectedInstancia.entidadNombre}</span></div>
                        <div><span className="text-gray-500">Formato:</span><span className="ml-2 font-medium">{selectedInstancia.formatoRequerido || "Libre"}</span></div>
                        <div><span className="text-gray-500">Vencimiento:</span><span className={`ml-2 font-medium ${selectedInstancia.vencido ? "text-red-600" : ""}`}>{formatFecha(selectedInstancia.fechaVencimientoCalculada)}</span></div>
                        <div><span className="text-gray-500">Responsable:</span><span className="ml-2 font-medium">{selectedInstancia.responsableElaboracion}</span></div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Método de envío</label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer"><input type="radio" checked={modoEnvio === "archivo"} onChange={() => setModoEnvio("archivo")} className="mr-2" /><span className="text-sm">Subir archivo</span></label>
                      <label className="flex items-center cursor-pointer"><input type="radio" checked={modoEnvio === "link"} onChange={() => setModoEnvio("link")} className="mr-2" /><span className="text-sm">Ingresar link</span></label>
                    </div>
                  </div>

                  {modoEnvio === "archivo" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Archivo <span className="text-red-500">*</span></label>
                      <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} accept=".pdf,.xlsx,.xls,.doc,.docx,.csv" className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                      {archivo && <p className="mt-1 text-xs text-green-600">✓ {archivo.name}</p>}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link del reporte <span className="text-red-500">*</span></label>
                      <input type="url" value={linkReporte} onChange={(e) => setLinkReporte(e.target.value)} placeholder="https://drive.google.com/..." className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link evidencia (opcional)</label>
                    <input type="url" value={linkEvidencia} onChange={(e) => setLinkEvidencia(e.target.value)} placeholder="https://..." className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones (opcional)</label>
                    <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Notas adicionales..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none" />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button onClick={closeSendModal} disabled={enviando} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 disabled:opacity-50">Cancelar</button>
              {instanciasPendientes.length > 0 && (
                <button onClick={handleEnviar} disabled={enviando || !selectedInstancia || (modoEnvio === "archivo" && !archivo) || (modoEnvio === "link" && !linkReporte)} className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {enviando ? (<><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Enviando...</>) : "Confirmar envío"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN/CREACIÓN */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-5 overflow-y-auto z-[99999]">
          <div onClick={closeModal} className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"></div>
          <div className="relative w-full max-w-[800px] rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10 z-50 shadow-xl max-h-[90vh] overflow-y-auto">
            <button onClick={closeModal} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"></path></svg>
            </button>

            <form onSubmit={handleSave}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">{isNewReporte ? "Crear nuevo reporte" : "Editar reporte"}</h4>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Código <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })} placeholder="REP-001" required disabled={!isNewReporte} className={`h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 ${!isNewReporte ? "bg-gray-100 cursor-not-allowed" : "bg-transparent dark:bg-gray-900 dark:text-white/90"}`} />
                </div>

                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Entidad <span className="text-red-500">*</span></label>
                  <select value={formData.entidadId} onChange={(e) => setFormData({ ...formData, entidadId: Number(e.target.value) })} required className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                    <option value={0} disabled>Seleccione</option>
                    {entidades.map((e) => (<option key={e.id} value={e.id}>{e.razonSocial}</option>))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Frecuencia <span className="text-red-500">*</span></label>
                  <select value={formData.frecuenciaId} onChange={(e) => setFormData({ ...formData, frecuenciaId: Number(e.target.value) })} required className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                    <option value={0} disabled>Seleccione</option>
                    {frecuencias.map((f) => (<option key={f.id} value={f.id}>{f.nombre}</option>))}
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-3">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Nombre del reporte" required className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
                </div>

                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Día Entrega <span className="text-red-500">*</span></label>
                  <input type="number" min="1" max="31" value={formData.diaVencimiento} onChange={(e) => setFormData({ ...formData, diaVencimiento: Number(e.target.value) })} required className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
                </div>

                {getFrecuenciaNombre(formData.frecuenciaId) !== "MENSUAL" && (
                  <div className="col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">{getMesLabel(formData.frecuenciaId)}</label>
                    <select value={formData.mesVencimiento} onChange={(e) => setFormData({ ...formData, mesVencimiento: Number(e.target.value) })} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                      {getMesesPorFrecuencia(formData.frecuenciaId).map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                    </select>
                  </div>
                )}

                <div className="col-span-1 sm:col-span-3">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300"><strong>📅 Resumen:</strong> {getVencimientoPreview()}</p>
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Plazo Adicional (días)</label>
                  <input type="number" min="0" value={formData.plazoAdicionalDias} onChange={(e) => setFormData({ ...formData, plazoAdicionalDias: Number(e.target.value) })} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Responsable Elaboración <span className="text-red-500">*</span></label>
                  <select value={formData.responsableElaboracionId} onChange={(e) => setFormData({ ...formData, responsableElaboracionId: Number(e.target.value) })} required className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                    <option value={0} disabled>Seleccione</option>
                    {responsables.map((u) => (<option key={u.id} value={u.id}>{u.nombreCompleto}</option>))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Supervisor <span className="text-red-500">*</span></label>
                  <select value={formData.responsableSupervisionId} onChange={(e) => setFormData({ ...formData, responsableSupervisionId: Number(e.target.value) })} required className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                    <option value={0} disabled>Seleccione</option>
                    {supervisores.map((u) => (<option key={u.id} value={u.id}>{u.nombreCompleto}</option>))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Fecha Inicio Vigencia <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.fechaInicioVigencia} onChange={(e) => setFormData({ ...formData, fechaInicioVigencia: e.target.value })} required className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
                </div>

                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Fecha Fin Vigencia <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.fechaFinVigencia} onChange={(e) => setFormData({ ...formData, fechaFinVigencia: e.target.value })} required min={formData.fechaInicioVigencia || undefined} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
                </div>

                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Formato</label>
                  <input type="text" value={formData.formatoRequerido} onChange={(e) => setFormData({ ...formData, formatoRequerido: e.target.value })} placeholder="PDF, Excel..." className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Link Instrucciones</label>
                  <input type="url" value={formData.linkInstrucciones} onChange={(e) => setFormData({ ...formData, linkInstrucciones: e.target.value })} placeholder="https://..." className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
                </div>

                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Estado</label>
                  <div className="flex items-center gap-4 h-11">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.activo} onChange={() => setFormData({ ...formData, activo: true })} className="w-4 h-4" /><span className="text-sm">Activo</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!formData.activo} onChange={() => setFormData({ ...formData, activo: false })} className="w-4 h-4" /><span className="text-sm">Inactivo</span></label>
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-3">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Base Legal</label>
                  <textarea rows={2} value={formData.baseLegal} onChange={(e) => setFormData({ ...formData, baseLegal: e.target.value })} placeholder="Ley, decreto..." className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 resize-none" />
                </div>
              </div>

              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-3 text-sm font-medium text-white rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Guardando..." : isNewReporte ? "Crear Reporte" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}