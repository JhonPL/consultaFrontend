import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import alertaService, { AlertaDTO } from "../../services/alertaService";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [alertas, setAlertas] = useState<AlertaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [countNoLeidas, setCountNoLeidas] = useState(0);

  // Cargar contador de no leídas
  const cargarContador = useCallback(async () => {
    try {
      const count = await alertaService.contarNoLeidas();
      setCountNoLeidas(count);
    } catch (error) {
      console.error("Error cargando contador de alertas:", error);
    }
  }, []);

  // Cargar alertas
  const cargarAlertas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await alertaService.listarMisAlertasNoLeidas();
      setAlertas(data.slice(0, 10)); // Máximo 10 en el dropdown
      setCountNoLeidas(data.length);
    } catch (error) {
      console.error("Error cargando alertas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar al montar y cada 60 segundos
  useEffect(() => {
    cargarContador();
    const interval = setInterval(cargarContador, 60000);
    return () => clearInterval(interval);
  }, [cargarContador]);

  // Cargar alertas cuando se abre el dropdown
  useEffect(() => {
    if (isOpen) {
      cargarAlertas();
    }
  }, [isOpen, cargarAlertas]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleMarcarLeida = async (id: number) => {
    try {
      await alertaService.marcarComoLeida(id);
      setAlertas((prev) => prev.filter((a) => a.id !== id));
      setCountNoLeidas((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marcando alerta como leída:", error);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      await alertaService.marcarTodasComoLeidas();
      setAlertas([]);
      setCountNoLeidas(0);
    } catch (error) {
      console.error("Error marcando todas como leídas:", error);
    }
  };

  // Obtener color e icono según tipo de alerta
  const getAlertaEstilo = (alerta: AlertaDTO) => {
    const tipo = alerta.tipoAlertaNombre?.toUpperCase() || "";

    if (tipo.includes("VENCID") || tipo.includes("CRÍTICA") || tipo.includes("CRITICA")) {
      return {
        bgColor: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-600 dark:text-red-400",
        borderColor: "border-red-200 dark:border-red-800",
        emoji: "🔴",
      };
    } else if (tipo.includes("URGENTE") || tipo.includes("RIESGO") || tipo.includes("1 DÍA")) {
      return {
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        textColor: "text-orange-600 dark:text-orange-400",
        borderColor: "border-orange-200 dark:border-orange-800",
        emoji: "🟠",
      };
    } else if (tipo.includes("INTERMEDIA") || tipo.includes("SEGUIMIENTO") || tipo.includes("5 DÍAS")) {
      return {
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        textColor: "text-yellow-600 dark:text-yellow-400",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        emoji: "🟡",
      };
    } else {
      return {
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-600 dark:text-blue-400",
        borderColor: "border-blue-200 dark:border-blue-800",
        emoji: "🟢",
      };
    }
  };

  // Formatear tiempo relativo
  const formatTiempoRelativo = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    const diff = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return "Ahora";
    if (minutos < 60) return `${minutos} min`;
    if (horas < 24) return `${horas}h`;
    if (dias < 7) return `${dias}d`;
    return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {/* Indicador de notificaciones */}
        {countNoLeidas > 0 && (
          <span className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {countNoLeidas > 9 ? "9+" : countNoLeidas}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para cerrar */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeDropdown}
          ></div>

          {/* Panel de notificaciones */}
          <div className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 sm:w-[380px] lg:right-0 z-50">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <h5 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Notificaciones
                </h5>
                {countNoLeidas > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                    {countNoLeidas}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {countNoLeidas > 0 && (
                  <button
                    onClick={handleMarcarTodasLeidas}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Marcar todas
                  </button>
                )}
                <button
                  onClick={closeDropdown}
                  className="p-1 text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Lista de alertas */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                </div>
              ) : alertas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                  <svg className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">
                    No tienes notificaciones pendientes
                  </p>
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    ¡Todo está al día! 🎉
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {alertas.map((alerta) => {
                    const estilo = getAlertaEstilo(alerta);
                    return (
                      <li
                        key={alerta.id}
                        className={`relative px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                          !alerta.leida ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                        }`}
                        onClick={() => handleMarcarLeida(alerta.id)}
                      >
                        <div className="flex gap-3">
                          {/* Icono/Emoji */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${estilo.bgColor}`}>
                            <span className="text-lg">{estilo.emoji}</span>
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                {alerta.tipoAlertaNombre || "Alerta"}
                              </p>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatTiempoRelativo(alerta.fechaProgramada)}
                              </span>
                            </div>
                            
                            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {alerta.reporteNombre}
                              {alerta.periodoReportado && (
                                <span className="text-gray-400"> • {alerta.periodoReportado}</span>
                              )}
                            </p>

                            {alerta.mensaje && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {alerta.mensaje.substring(0, 100)}...
                              </p>
                            )}

                            {/* Badge del destinatario (útil para admin) */}
                            {alerta.usuarioDestinoNombre && (
                              <p className="mt-1 text-xs text-gray-400">
                                Para: {alerta.usuarioDestinoNombre}
                              </p>
                            )}
                          </div>

                          {/* Indicador no leída */}
                          {!alerta.leida && (
                            <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/alertas"
                onClick={closeDropdown}
                className="block w-full px-4 py-2 text-sm font-medium text-center text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Ver todas las notificaciones
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}