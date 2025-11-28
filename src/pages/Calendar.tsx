import { useState, useRef, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg, DatesSetArg } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import calendarioService, { EventoCalendario } from "../services/calendarioService";
import entidadService, { Entidad } from "../services/entidadService";
import frecuenciaService, { Frecuencia } from "../services/frecuenciaService";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: EventoCalendario;
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<EventoCalendario | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  // Filtros
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [frecuencias, setFrecuencias] = useState<Frecuencia[]>([]);
  const [filterEntidad, setFilterEntidad] = useState<number | undefined>();
  const [filterFrecuencia, setFilterFrecuencia] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  // Cargar entidades y frecuencias al inicio
  useEffect(() => {
    const cargarFiltros = async () => {
      try {
        const [entidadesData, frecuenciasData] = await Promise.all([
          entidadService.listar(),
          frecuenciaService.listar(),
        ]);
        setEntidades(entidadesData.filter(e => e.activo));
        setFrecuencias(frecuenciasData);
      } catch (err) {
        console.error("Error cargando filtros:", err);
      }
    };
    cargarFiltros();
  }, []);

  // Obtener los meses únicos que abarca un rango de fechas
  const getMesesEnRango = (start: Date, end: Date): string[] => {
    const meses: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const final = new Date(end.getFullYear(), end.getMonth(), 1);
    
    while (current <= final) {
      const mes = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      meses.push(mes);
      current.setMonth(current.getMonth() + 1);
    }
    
    return meses;
  };

  // Función para cargar eventos
  const cargarEventos = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    setError(null);
    
    try {
      // Obtener todos los meses que abarca el rango visible
      const meses = getMesesEnRango(start, end);
      
      // Cargar eventos de todos los meses necesarios
      const promesas = meses.map(mes => 
        calendarioService.obtenerEventos(mes, filterEntidad, undefined, filterFrecuencia)
      );
      
      const resultados = await Promise.all(promesas);
      const todosEventos = resultados.flat();
      
      // Eliminar duplicados por ID
      const eventosUnicos = todosEventos.reduce((acc, evento) => {
        if (!acc.find(e => e.id === evento.id)) {
          acc.push(evento);
        }
        return acc;
      }, [] as EventoCalendario[]);

      // Transformar eventos para FullCalendar
      const eventosFormateados: CalendarEvent[] = eventosUnicos.map((evento) => ({
        id: evento.id?.toString() || Math.random().toString(),
        title: evento.titulo || "Sin título",
        start: evento.start || evento.fecha?.toString() || "",
        end: evento.end,
        allDay: true,
        backgroundColor: evento.backgroundColor || getColorByPrioridad(evento.prioridad, evento.diasHastaVencimiento),
        borderColor: evento.borderColor || getColorByPrioridad(evento.prioridad, evento.diasHastaVencimiento),
        textColor: "#FFFFFF",
        extendedProps: evento,
      }));

      setEvents(eventosFormateados);
    } catch (err) {
      console.error("Error cargando eventos:", err);
      setError("No se pudieron cargar los eventos. Verifica la conexión con el servidor.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filterEntidad, filterFrecuencia]);

  // Cargar eventos cuando cambia el rango o los filtros
  useEffect(() => {
    if (dateRange) {
      cargarEventos(dateRange.start, dateRange.end);
    }
  }, [dateRange, cargarEventos]);

  const getColorByPrioridad = (prioridad?: string, dias?: number): string => {
    if (prioridad) {
      switch (prioridad.toUpperCase()) {
        case "CRITICA": return "#DC2626";
        case "ALTA": return "#EA580C";
        case "MEDIA": return "#D97706";
        case "BAJA": return "#059669";
        default: break;
      }
    }
    
    if (dias !== undefined) {
      if (dias < 0) return "#DC2626";
      if (dias <= 1) return "#EA580C";
      if (dias <= 7) return "#D97706";
      return "#059669";
    }
    
    return "#6B7280";
  };

  const handleDatesSet = (dateInfo: DatesSetArg) => {
    // Guardar el rango completo de fechas visibles
    const newRange = {
      start: dateInfo.start,
      end: dateInfo.end,
    };
    
    // Solo actualizar si el rango cambió significativamente
    if (!dateRange || 
        dateRange.start.getTime() !== newRange.start.getTime() || 
        dateRange.end.getTime() !== newRange.end.getTime()) {
      setDateRange(newRange);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventData = clickInfo.event.extendedProps as EventoCalendario;
    setSelectedEvent({
      ...eventData,
      titulo: clickInfo.event.title,
    } as EventoCalendario);
    openModal();
  };

  const clearFilters = () => {
    setFilterEntidad(undefined);
    setFilterFrecuencia(undefined);
  };

  const getEstadoBadge = (estado?: string, dias?: number) => {
    const estadoLower = estado?.toLowerCase() || "";
    
    if (estadoLower.includes("enviado") || estadoLower.includes("aprobado")) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          ✓ {estado}
        </span>
      );
    }
    
    if (estadoLower.includes("vencido") || (dias !== undefined && dias < 0)) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
          ⚠ Vencido
        </span>
      );
    }
    
    if (dias !== undefined && dias <= 3) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
          ⏰ Urgente
        </span>
      );
    }
    
    if (dias !== undefined && dias <= 7) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          📅 Próximo
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
        {estado || "Pendiente"}
      </span>
    );
  };

  const formatFecha = (fecha?: string) => {
    if (!fecha) return "Sin fecha";
    try {
      const date = new Date(fecha + "T12:00:00");
      return date.toLocaleDateString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return fecha;
    }
  };

  const getDiasTexto = (dias?: number) => {
    if (dias === undefined || dias === null) return "";
    
    if (dias < 0) {
      const diasVencido = Math.abs(dias);
      return `Vencido hace ${diasVencido} día${diasVencido !== 1 ? "s" : ""}`;
    }
    if (dias === 0) return "¡Vence hoy!";
    if (dias === 1) return "Vence mañana";
    return `Vence en ${dias} días`;
  };

  const handleRefresh = () => {
    if (dateRange) {
      cargarEventos(dateRange.start, dateRange.end);
    }
  };

  return (
    <>
      <PageMeta
        title="Calendario de Reportes"
        description="Calendario de vencimientos de reportes regulatorios"
      />
      
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Calendario de Reportes
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Visualiza los vencimientos de tus obligaciones regulatorias
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                showFilters 
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
              {(filterEntidad || filterFrecuencia) && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                  {(filterEntidad ? 1 : 0) + (filterFrecuencia ? 1 : 0)}
                </span>
              )}
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                  Entidad
                </label>
                <select
                  value={filterEntidad || ""}
                  onChange={(e) => setFilterEntidad(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">Todas las entidades</option>
                  {entidades.map((e) => (
                    <option key={e.id} value={e.id}>{e.razonSocial}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                  Frecuencia
                </label>
                <select
                  value={filterFrecuencia || ""}
                  onChange={(e) => setFilterFrecuencia(e.target.value || undefined)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">Todas las frecuencias</option>
                  {frecuencias.map((f) => (
                    <option key={f.id} value={f.nombre}>{f.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  disabled={!filterEntidad && !filterFrecuencia}
                  className="h-10 px-4 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>

            {/* Leyenda de colores */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Leyenda de colores:</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-red-600"></span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Vencido / Crítico</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-orange-500"></span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Urgente (1-2 días)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-yellow-500"></span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Próximo (3-7 días)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-green-600"></span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Cumplido / A tiempo</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={handleRefresh}
                className="ml-auto text-sm text-red-700 hover:text-red-900 underline dark:text-red-400"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Calendario */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden relative">
          <style>{`
            .fc {
              font-family: inherit;
            }
            .fc .fc-toolbar-title {
              font-size: 1.25rem;
              font-weight: 600;
              text-transform: capitalize;
            }
            .fc .fc-button {
              padding: 0.5rem 1rem;
              font-size: 0.875rem;
              font-weight: 500;
              border-radius: 0.5rem;
              text-transform: capitalize;
            }
            .fc .fc-button-primary {
              background-color: #3B82F6;
              border-color: #3B82F6;
            }
            .fc .fc-button-primary:hover {
              background-color: #2563EB;
              border-color: #2563EB;
            }
            .fc .fc-button-primary:not(:disabled).fc-button-active {
              background-color: #1D4ED8;
              border-color: #1D4ED8;
            }
            .fc .fc-daygrid-event {
              border-radius: 4px;
              padding: 3px 6px;
              font-size: 0.75rem;
              font-weight: 500;
              margin-bottom: 2px;
              cursor: pointer;
              border: none !important;
            }
            .fc .fc-daygrid-event .fc-event-title {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .fc .fc-daygrid-day-events {
              min-height: 2rem;
              padding: 2px;
            }
            .fc .fc-daygrid-more-link {
              font-size: 0.75rem;
              font-weight: 600;
              color: #3B82F6;
              margin-top: 2px;
            }
            .fc-theme-standard td, .fc-theme-standard th {
              border-color: #E5E7EB;
            }
            .dark .fc-theme-standard td, .dark .fc-theme-standard th {
              border-color: #374151;
            }
            .fc .fc-col-header-cell-cushion {
              padding: 10px 4px;
              font-weight: 600;
              color: #374151;
              text-transform: capitalize;
            }
            .dark .fc .fc-col-header-cell-cushion {
              color: #D1D5DB;
            }
            .fc .fc-daygrid-day-number {
              padding: 8px;
              color: #374151;
              font-weight: 500;
            }
            .dark .fc .fc-daygrid-day-number {
              color: #D1D5DB;
            }
            .fc .fc-day-today {
              background-color: #EFF6FF !important;
            }
            .dark .fc .fc-day-today {
              background-color: rgba(59, 130, 246, 0.1) !important;
            }
            .fc .fc-daygrid-day-frame {
              min-height: 100px;
            }
            .fc-daygrid-week-number {
              color: #9CA3AF;
            }
          `}</style>
          
          {loading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-20">
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg">
                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cargando eventos...</span>
              </div>
            </div>
          )}
          
          <div className="p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={esLocale}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,dayGridWeek",
              }}
              buttonText={{
                today: "Hoy",
                month: "Mes",
                week: "Semana",
              }}
              events={events}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              height="auto"
              contentHeight="auto"
              dayMaxEvents={4}
              moreLinkText={(num) => `+${num} más`}
              displayEventTime={false}
              navLinks={true}
              weekNumbers={false}
              fixedWeekCount={false}
              showNonCurrentDates={true}
              eventDisplay="block"
            />
          </div>
        </div>

        {/* Resumen de eventos */}
        {events.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {events.filter(e => e.extendedProps.diasHastaVencimiento !== undefined && e.extendedProps.diasHastaVencimiento < 0).length}
              </p>
              <p className="text-xs text-red-600 dark:text-red-500">Vencidos</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {events.filter(e => e.extendedProps.diasHastaVencimiento !== undefined && e.extendedProps.diasHastaVencimiento >= 0 && e.extendedProps.diasHastaVencimiento <= 3).length}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-500">Urgentes (0-3 días)</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {events.filter(e => e.extendedProps.diasHastaVencimiento !== undefined && e.extendedProps.diasHastaVencimiento > 3 && e.extendedProps.diasHastaVencimiento <= 7).length}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">Próximos (4-7 días)</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {events.filter(e => {
                  const estado = e.extendedProps.estado?.toLowerCase() || "";
                  return estado.includes("enviado") || estado.includes("aprobado");
                }).length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">Cumplidos</p>
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay eventos */}
        {!loading && events.length === 0 && !error && (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No hay eventos para mostrar en este período
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Crea reportes para ver sus vencimientos aquí
            </p>
          </div>
        )}

        {/* Modal de detalle del evento */}
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[550px] p-0 overflow-hidden"
        >
          {selectedEvent && (
            <div className="flex flex-col">
              {/* Header del modal con color según prioridad */}
              <div 
                className="px-6 py-4"
                style={{ 
                  backgroundColor: getColorByPrioridad(selectedEvent.prioridad, selectedEvent.diasHastaVencimiento),
                }}
              >
                <h5 className="text-lg font-semibold text-white pr-8">
                  {selectedEvent.titulo}
                </h5>
                <p className="text-sm text-white/80 mt-1">
                  {selectedEvent.reporteId}
                </p>
              </div>

              {/* Contenido */}
              <div className="px-6 py-5">
                {/* Estado y días */}
                <div className="flex items-center justify-between mb-5">
                  {getEstadoBadge(selectedEvent.estado, selectedEvent.diasHastaVencimiento)}
                  <span className={`text-sm font-medium ${
                    (selectedEvent.diasHastaVencimiento ?? 0) < 0 
                      ? "text-red-600" 
                      : (selectedEvent.diasHastaVencimiento ?? 0) <= 3 
                      ? "text-orange-600" 
                      : "text-gray-600"
                  }`}>
                    {getDiasTexto(selectedEvent.diasHastaVencimiento)}
                  </span>
                </div>

                {/* Información en grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Entidad</p>
                    <p className="text-sm text-gray-800 dark:text-white/90">
                      {selectedEvent.entidad || "Sin entidad"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Frecuencia</p>
                    <p className="text-sm text-gray-800 dark:text-white/90">
                      {selectedEvent.frecuencia || "Sin frecuencia"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Responsable</p>
                    <p className="text-sm text-gray-800 dark:text-white/90">
                      {selectedEvent.responsable || "Sin asignar"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Periodo</p>
                    <p className="text-sm text-gray-800 dark:text-white/90">
                      {selectedEvent.periodoReportado || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Fecha de vencimiento destacada */}
                <div className="mt-5 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Fecha de vencimiento
                  </p>
                  <p className="text-base font-semibold text-gray-800 dark:text-white/90">
                    {formatFecha(selectedEvent.fecha?.toString() || selectedEvent.start)}
                  </p>
                </div>

                {/* Información adicional */}
                {(selectedEvent.formatoRequerido || selectedEvent.baseLegal) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    {selectedEvent.formatoRequerido && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Formato requerido</p>
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          {selectedEvent.formatoRequerido}
                        </p>
                      </div>
                    )}
                    {selectedEvent.baseLegal && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Base legal</p>
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          {selectedEvent.baseLegal}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedEvent.linkInstrucciones && (
                  <div className="mt-4">
                    <a 
                      href={selectedEvent.linkInstrucciones}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Ver instrucciones
                    </a>
                  </div>
                )}

                {selectedEvent.observaciones && (
                  <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">Observaciones</p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      {selectedEvent.observaciones}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer del modal */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};

export default Calendar;