import { useState, useEffect } from "react";
import entidadService, { Entidad } from "../../../services/entidadService";

export default function TableEntidades() {
  // Estados principales
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del modal
  const [isOpen, setIsOpen] = useState(false);
  const [isNewEntidad, setIsNewEntidad] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState<Entidad>({
    nit: "",
    razonSocial: "",
    paginaWeb: "",
    baseLegal: "",
    activo: true,
  });

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);

  // Dropdown de acciones
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

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
      const data = await entidadService.listar();
      setEntidades(data);
    } catch (err: any) {
      console.error("Error cargando entidades:", err);
      setError("Error al cargar las entidades. Verifique que el backend esté ejecutándose.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entidad: Entidad) => {
    setFormData({
      id: entidad.id,
      nit: entidad.nit,
      razonSocial: entidad.razonSocial,
      paginaWeb: entidad.paginaWeb || "",
      baseLegal: entidad.baseLegal || "",
      activo: entidad.activo,
    });
    setIsNewEntidad(false);
    setIsOpen(true);
    setOpenDropdown(null);
  };

  const openNewModal = () => {
    setFormData({
      nit: "",
      razonSocial: "",
      paginaWeb: "",
      baseLegal: "",
      activo: true,
    });
    setIsNewEntidad(true);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Seguro que deseas eliminar esta entidad? Esta acción puede afectar los reportes asociados.")) {
      try {
        await entidadService.eliminar(id);
        setEntidades((prev) => prev.filter((e) => e.id !== id));
      } catch (err: any) {
        console.error("Error eliminando entidad:", err);
        alert(err.response?.data?.message || "Error al eliminar la entidad. Puede tener reportes asociados.");
      }
    }
    setOpenDropdown(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    setFormData({
      nit: "",
      razonSocial: "",
      paginaWeb: "",
      baseLegal: "",
      activo: true,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isNewEntidad) {
        const nuevaEntidad = await entidadService.crear(formData);
        setEntidades((prev) => [...prev, nuevaEntidad]);
      } else {
        const entidadActualizada = await entidadService.actualizar(formData.id!, formData);
        setEntidades((prev) =>
          prev.map((e) => (e.id === formData.id ? entidadActualizada : e))
        );
      }
      closeModal();
    } catch (err: any) {
      console.error("Error guardando entidad:", err);
      const message = err.response?.data?.message || "Error al guardar la entidad";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterEstado("Todos");
  };

  // Filtrar entidades
  const filteredEntidades = entidades.filter((e) => {
    const matchSearch =
      e.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.nit.toLowerCase().includes(searchTerm.toLowerCase());

    const matchEstado =
      filterEstado === "Todos" ||
      (filterEstado === "Activo" && e.activo) ||
      (filterEstado === "Inactivo" && !e.activo);

    return matchSearch && matchEstado;
  });

  // Formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
          <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando entidades...</span>
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
          <button
            onClick={cargarDatos}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
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
            Gestión de Entidades
          </h3>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              <svg className="stroke-current fill-white dark:fill-gray-800" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.29004 5.90393H17.7067" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M17.7075 14.0961H2.29085" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z" fill="" stroke="" strokeWidth="1.5"></path>
                <path d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z" fill="" stroke="" strokeWidth="1.5"></path>
              </svg>
              Filtros
            </button>

            <button
              onClick={cargarDatos}
              className="text-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              title="Recargar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={openNewModal}
              className="text-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4.16669V15.8334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.16669 10H15.8334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Nueva Entidad
            </button>
          </div>
        </div>

        {/* Panel de filtros desplegable */}
        {showFilters && (
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Buscar por razón social o NIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-4 pl-[42px] text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Estado
                  </label>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="h-11 px-4 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Limpiar
                  </button>
                </div>
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
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">NIT</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Razón Social</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Página Web</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Estado</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Creación</th>
              <th className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntidades.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No se encontraron entidades
                </td>
              </tr>
            ) : (
              filteredEntidades.map((entidad) => (
                <tr
                  key={entidad.id}
                  className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                >
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-mono">{entidad.nit}</td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">{entidad.razonSocial}</td>
                  <td className="py-3 px-4">
                    {entidad.paginaWeb ? (
                      <a
                        href={entidad.paginaWeb}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 truncate block max-w-[200px]"
                      >
                        {entidad.paginaWeb}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        entidad.activo
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {entidad.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">
                    {formatDate(entidad.fechaCreacion)}
                  </td>
                  <td className="py-3 px-4 text-right relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === entidad.id ? null : entidad.id!);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>

                    {openDropdown === entidad.id && (
                      <div className="absolute right-0 mt-2 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                        <button
                          onClick={() => handleEdit(entidad)}
                          className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(entidad.id!)}
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
          <div
            onClick={closeModal}
            className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
          ></div>

          <div className="relative w-full max-w-[600px] rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10 z-50 shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="group absolute right-3 top-3 z-50 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-200 text-gray-500 transition-colors hover:bg-gray-300 hover:text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 sm:right-6 sm:top-6 sm:h-11 sm:w-11"
            >
              <svg className="transition-colors fill-current" width="24" height="24" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"></path>
              </svg>
            </button>

            <form onSubmit={handleSave}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                {isNewEntidad ? "Crear nueva entidad" : "Editar entidad"}
              </h4>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                {/* NIT */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    NIT <span className="text-red-500">*</span>
                    {!isNewEntidad && <span className="text-gray-400 text-xs ml-2">(no editable)</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.nit}
                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                    placeholder="900123456-7"
                    required
                    disabled={!isNewEntidad}
                    className={`h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-blue-300 focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:text-white/90 ${
                      !isNewEntidad
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500"
                        : "bg-transparent text-gray-800 dark:bg-gray-900"
                    }`}
                  />
                </div>

                {/* Estado */}
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Estado
                  </label>
                  <div className="flex items-center gap-4 h-11">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="estado"
                        checked={formData.activo}
                        onChange={() => setFormData({ ...formData, activo: true })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="estado"
                        checked={!formData.activo}
                        onChange={() => setFormData({ ...formData, activo: false })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Inactivo</span>
                    </label>
                  </div>
                </div>

                {/* Razón Social */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Razón Social <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.razonSocial}
                    onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                    placeholder="Nombre de la entidad"
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-blue-300 focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Página Web */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Página Web
                  </label>
                  <input
                    type="url"
                    value={formData.paginaWeb}
                    onChange={(e) => setFormData({ ...formData, paginaWeb: e.target.value })}
                    placeholder="https://www.ejemplo.gov.co"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-blue-300 focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Base Legal */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Base Legal
                  </label>
                  <textarea
                    rows={3}
                    value={formData.baseLegal}
                    onChange={(e) => setFormData({ ...formData, baseLegal: e.target.value })}
                    placeholder="Ley, decreto o resolución que fundamenta los reportes a esta entidad"
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-blue-300 focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 resize-none"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 sm:w-auto disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-blue-600 shadow-theme-xs hover:bg-blue-700 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </div>
                  ) : isNewEntidad ? (
                    "Crear Entidad"
                  ) : (
                    "Guardar Cambios"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}