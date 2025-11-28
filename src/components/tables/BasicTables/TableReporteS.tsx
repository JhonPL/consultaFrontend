import { useState, useEffect } from "react";
import reporteService, { Reporte, ReporteRequest } from "../../../services/reporteService";
import entidadService, { Entidad } from "../../../services/entidadService";
import frecuenciaService, { Frecuencia } from "../../../services/frecuenciaService";
import usuarioService, { Usuario } from "../../../services/usuarioService";

export default function TableReportes() {
  // Estados principales
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [frecuencias, setFrecuencias] = useState<Frecuencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [responsables, setResponsables] = useState<Usuario[]>([]); // Solo rol RESPONSABLE
  const [supervisores, setSupervisores] = useState<Usuario[]>([]); // Solo rol SUPERVISOR
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del modal
  const [isOpen, setIsOpen] = useState(false);
  const [isNewReporte, setIsNewReporte] = useState(false);
  const [saving, setSaving] = useState(false);

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

      // Filtrar usuarios por rol
      const usuariosActivos = usuariosData.filter(u => u.activo);
      setResponsables(usuariosActivos.filter(u =>
        u.rol?.nombre?.toUpperCase().includes('RESPONSABLE')
      ));
      setSupervisores(usuariosActivos.filter(u =>
        u.rol?.nombre?.toUpperCase().includes('SUPERVISOR')
      ));
    } catch (err: any) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos. Verifique que el backend esté ejecutándose.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reporte: Reporte) => {
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
    setOpenDropdown(null);
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

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que deseas eliminar este reporte? Esta acción puede afectar las instancias asociadas.")) {
      try {
        await reporteService.eliminar(id);
        setReportes((prev) => prev.filter((r) => r.id !== id));
      } catch (err: any) {
        console.error("Error eliminando reporte:", err);
        alert(err.response?.data?.message || "Error al eliminar el reporte.");
      }
    }
    setOpenDropdown(null);
  };

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
      } else {
        const reporteActualizado = await reporteService.actualizar(formData.id, reporteRequest);
        setReportes((prev) =>
          prev.map((r) => (r.id === formData.id ? reporteActualizado : r))
        );
      }
      closeModal();
    } catch (err: any) {
      console.error("Error guardando reporte:", err);
      const message = err.response?.data?.message || "Error al guardar el reporte";
      alert(message);
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

  // Filtrar reportes
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

  // Meses para el selector (anual)
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

  // Meses del trimestre
  const mesesTrimestre = [
    { value: 1, label: "Mes 1 del trimestre" },
    { value: 2, label: "Mes 2 del trimestre" },
    { value: 3, label: "Mes 3 del trimestre" },
  ];

  // Meses del semestre
  const mesesSemestre = [
    { value: 1, label: "Mes 1 del semestre" },
    { value: 2, label: "Mes 2 del semestre" },
    { value: 3, label: "Mes 3 del semestre" },
    { value: 4, label: "Mes 4 del semestre" },
    { value: 5, label: "Mes 5 del semestre" },
    { value: 6, label: "Mes 6 del semestre" },
  ];

  // Obtener nombre de frecuencia por ID
  const getFrecuenciaNombre = (frecuenciaId: number): string => {
    const frecuencia = frecuencias.find(f => f.id === frecuenciaId);
    return frecuencia?.nombre?.toUpperCase() || "";
  };

  // Obtener label del campo mes según frecuencia
  const getMesLabel = (frecuenciaId: number): React.ReactNode => {
    const nombre = getFrecuenciaNombre(frecuenciaId);
    if (nombre.includes("TRIMESTRAL")) {
      return (
        <>
          Mes del Trimestre <span className="text-red-500">*</span>
          <span className="text-gray-400 text-xs ml-1 block">(1°, 2° o 3° mes)</span>
        </>
      );
    }
    if (nombre.includes("SEMESTRAL")) {
      return (
        <>
          Mes del Semestre <span className="text-red-500">*</span>
          <span className="text-gray-400 text-xs ml-1 block">(del 1° al 6° mes)</span>
        </>
      );
    }
    if (nombre.includes("ANUAL")) {
      return (
        <>
          Mes del Año <span className="text-red-500">*</span>
          <span className="text-gray-400 text-xs ml-1 block">(Enero a Diciembre)</span>
        </>
      );
    }
    return "Mes de Entrega";
  };

  // Obtener opciones de meses según frecuencia
  const getMesesPorFrecuencia = (frecuenciaId: number) => {
    const nombre = getFrecuenciaNombre(frecuenciaId);
    if (nombre.includes("TRIMESTRAL")) return mesesTrimestre;
    if (nombre.includes("SEMESTRAL")) return mesesSemestre;
    return meses; // Anual u otro
  };

  // Generar preview de vencimiento
  const getVencimientoPreview = (): string => {
    const nombre = getFrecuenciaNombre(formData.frecuenciaId);
    const dia = formData.diaVencimiento;
    const mes = formData.mesVencimiento;

    if (nombre.includes("MENSUAL")) {
      return `Este reporte vence el día ${dia} de cada mes.`;
    }

    if (nombre.includes("TRIMESTRAL")) {
      const mesesDelAno = ["Enero", "Abril", "Julio", "Octubre"]; // Inicio de trimestres
      const mesesVencimiento = mesesDelAno.map((_, i) => {
        const mesBase = i * 3; // 0, 3, 6, 9
        const mesReal = mesBase + mes; // Mes dentro del trimestre
        const nombreMes = meses[mesReal - 1]?.label || "";
        return `${dia} de ${nombreMes}`;
      });
      return `Vence el ${mesesVencimiento.join(", ")}.`;
    }

    if (nombre.includes("SEMESTRAL")) {
      const mesRealS1 = mes; // Primer semestre
      const mesRealS2 = mes + 6; // Segundo semestre
      const nombreMesS1 = meses[mesRealS1 - 1]?.label || "";
      const nombreMesS2 = meses[mesRealS2 - 1]?.label || "";
      return `Vence el ${dia} de ${nombreMesS1} y ${dia} de ${nombreMesS2}.`;
    }

    if (nombre.includes("ANUAL")) {
      const nombreMes = meses[mes - 1]?.label || "";
      return `Vence el ${dia} de ${nombreMes} cada año.`;
    }

    if (nombre.includes("DIARIO")) {
      return `Este reporte vence todos los días.`;
    }

    if (nombre.includes("SEMANAL")) {
      return `Este reporte vence cada semana.`;
    }

    return "Seleccione una frecuencia para ver el calendario de vencimiento.";
  };

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando reportes...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm dark:border-red-800 dark:bg-red-900/20">
        <div className="flex flex-col items-center justify-center gap-4">
          <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={cargarDatos} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Encabezado */}
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Gestión de Reportes
          </h3>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              <svg className="stroke-current fill-white dark:fill-gray-800" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2.29004 5.90393H17.7067" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M17.7075 14.0961H2.29085" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              Filtros
            </button>

            <button
              onClick={cargarDatos}
              className="text-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              title="Recargar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={openNewModal}
              className="text-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4.16669V15.8334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.16669 10H15.8334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Nuevo Reporte
            </button>
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-4 pl-[42px] text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  value={filterEntidad}
                  onChange={(e) => setFilterEntidad(e.target.value)}
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="Todos">Todas las entidades</option>
                  {entidades.map((e) => (
                    <option key={e.id} value={e.razonSocial}>{e.razonSocial}</option>
                  ))}
                </select>

                <select
                  value={filterFrecuencia}
                  onChange={(e) => setFilterFrecuencia(e.target.value)}
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="Todos">Todas las frecuencias</option>
                  {frecuencias.map((f) => (
                    <option key={f.id} value={f.nombre}>{f.nombre}</option>
                  ))}
                </select>

                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>

                <button onClick={clearFilters} className="h-11 px-4 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400">
                  Limpiar
                </button>
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
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No se encontraron reportes
                </td>
              </tr>
            ) : (
              filteredReportes.map((reporte) => (
                <tr key={reporte.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-mono text-xs">{reporte.id}</td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200 max-w-[200px] truncate">{reporte.nombre}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 truncate max-w-[150px]">
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
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${reporte.activo
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                      {reporte.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === reporte.id ? null : reporte.id!);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>

                    {openDropdown === reporte.id && (
                      <div className="absolute right-0 mt-2 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                        <button
                          onClick={() => handleEdit(reporte)}
                          className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(reporte.id!)}
                          className="block w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                        >
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

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-5 overflow-y-auto z-[99999]">
          <div onClick={closeModal} className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"></div>

          <div className="relative w-full max-w-[800px] rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10 z-50 shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="group absolute right-3 top-3 z-50 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 sm:right-6 sm:top-6 sm:h-11 sm:w-11"
            >
              <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"></path>
              </svg>
            </button>

            <form onSubmit={handleSave}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                {isNewReporte ? "Crear nuevo reporte" : "Editar reporte"}
              </h4>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
                {/* Código */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Código <span className="text-red-500">*</span>
                    {!isNewReporte && <span className="text-gray-400 text-xs ml-1">(no editable)</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                    placeholder="REP-001"
                    required
                    disabled={!isNewReporte}
                    className={`h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 dark:border-gray-700 ${!isNewReporte ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800" : "bg-transparent text-gray-800 dark:bg-gray-900 dark:text-white/90"
                      }`}
                  />
                </div>

                {/* Entidad */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Entidad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.entidadId}
                    onChange={(e) => setFormData({ ...formData, entidadId: Number(e.target.value) })}
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0} disabled>Seleccione</option>
                    {entidades.map((e) => (
                      <option key={e.id} value={e.id}>{e.razonSocial}</option>
                    ))}
                  </select>
                </div>

                {/* Frecuencia */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Frecuencia <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.frecuenciaId}
                    onChange={(e) => setFormData({ ...formData, frecuenciaId: Number(e.target.value) })}
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0} disabled>Seleccione</option>
                    {frecuencias.map((f) => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Nombre */}
                <div className="col-span-1 sm:col-span-3">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Nombre del Reporte <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre descriptivo del reporte"
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Día vencimiento */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Día de Entrega <span className="text-red-500">*</span>
                    <span className="text-gray-400 text-xs ml-1 block">(día del mes para entregar)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.diaVencimiento}
                    onChange={(e) => setFormData({ ...formData, diaVencimiento: Number(e.target.value) })}
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Mes vencimiento - Dinámico según frecuencia */}
                {getFrecuenciaNombre(formData.frecuenciaId) !== "MENSUAL" && (
                  <div className="col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                      {getMesLabel(formData.frecuenciaId)}
                    </label>
                    <select
                      value={formData.mesVencimiento}
                      onChange={(e) => setFormData({ ...formData, mesVencimiento: Number(e.target.value) })}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    >
                      {getMesesPorFrecuencia(formData.frecuenciaId).map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Espacio vacío cuando es mensual para mantener layout */}
                {getFrecuenciaNombre(formData.frecuenciaId) === "MENSUAL" && (
                  <div className="col-span-1"></div>
                )}

                {/* Preview de vencimiento */}
                <div className="col-span-1 sm:col-span-3">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>📅 Resumen de vencimiento:</strong> {getVencimientoPreview()}
                    </p>
                  </div>
                </div>

                {/* Plazo adicional */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Plazo Adicional (días)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.plazoAdicionalDias}
                    onChange={(e) => setFormData({ ...formData, plazoAdicionalDias: Number(e.target.value) })}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Responsable Elaboración */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Responsable Elaboración <span className="text-red-500">*</span>
                    <span className="text-gray-400 text-xs ml-1">(Rol: Responsable)</span>
                  </label>
                  <select
                    value={formData.responsableElaboracionId}
                    onChange={(e) => setFormData({ ...formData, responsableElaboracionId: Number(e.target.value) })}
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0} disabled>Seleccione un responsable</option>
                    {responsables.length === 0 ? (
                      <option value={0} disabled>No hay usuarios con rol Responsable</option>
                    ) : (
                      responsables.map((u) => (
                        <option key={u.id} value={u.id}>{u.nombreCompleto} - {u.cargo}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Responsable Supervisión */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Supervisor <span className="text-red-500">*</span>
                    <span className="text-gray-400 text-xs ml-1">(Rol: Supervisor)</span>
                  </label>
                  <select
                    value={formData.responsableSupervisionId}
                    onChange={(e) => setFormData({ ...formData, responsableSupervisionId: Number(e.target.value) })}
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0} disabled>Seleccione un supervisor</option>
                    {supervisores.length === 0 ? (
                      <option value={0} disabled>No hay usuarios con rol Supervisor</option>
                    ) : (
                      supervisores.map((u) => (
                        <option key={u.id} value={u.id}>{u.nombreCompleto}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Fecha Inicio Vigencia */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Fecha Inicio Vigencia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fechaInicioVigencia}
                    onChange={(e) => setFormData({ ...formData, fechaInicioVigencia: e.target.value })}
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Fecha Fin Vigencia */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Fecha Fin Vigencia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fechaFinVigencia}
                    onChange={(e) => setFormData({ ...formData, fechaFinVigencia: e.target.value })}
                    required
                    min={formData.fechaInicioVigencia || undefined}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Formato Requerido */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Formato Requerido
                  </label>
                  <input
                    type="text"
                    value={formData.formatoRequerido}
                    onChange={(e) => setFormData({ ...formData, formatoRequerido: e.target.value })}
                    placeholder="PDF, Excel, etc."
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Link Instrucciones */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Link Instrucciones
                  </label>
                  <input
                    type="url"
                    value={formData.linkInstrucciones}
                    onChange={(e) => setFormData({ ...formData, linkInstrucciones: e.target.value })}
                    placeholder="https://..."
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Estado */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Estado</label>
                  <div className="flex items-center gap-4 h-11">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={formData.activo} onChange={() => setFormData({ ...formData, activo: true })} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={!formData.activo} onChange={() => setFormData({ ...formData, activo: false })} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Inactivo</span>
                    </label>
                  </div>
                </div>

                {/* Base Legal */}
                <div className="col-span-1 sm:col-span-3">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Base Legal</label>
                  <textarea
                    rows={2}
                    value={formData.baseLegal}
                    onChange={(e) => setFormData({ ...formData, baseLegal: e.target.value })}
                    placeholder="Ley, decreto o resolución..."
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 resize-none"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 sm:w-auto disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-blue-600 hover:bg-blue-700 sm:w-auto disabled:opacity-50"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </div>
                  ) : isNewReporte ? "Crear Reporte" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}