import api from "./api";

export interface AlertaDTO {
  id: number;
  instanciaId: number | null;
  reporteNombre: string | null;
  periodoReportado: string | null;
  tipoAlertaId: number | null;
  tipoAlertaNombre: string | null;
  tipoAlertaColor: string | null;
  usuarioDestinoId: number | null;
  usuarioDestinoNombre: string | null;
  fechaProgramada: string;
  fechaEnviada: string | null;
  enviada: boolean;
  mensaje: string | null;
  leida: boolean;
}

export interface ContadorAlertas {
  noLeidas: number;
}

const alertaService = {
  /**
   * Obtener mis alertas (según rol del usuario)
   */
  listarMisAlertas: async (): Promise<AlertaDTO[]> => {
    const response = await api.get<AlertaDTO[]>("/alertas/mis-alertas");
    return response.data;
  },

  /**
   * Obtener mis alertas no leídas
   */
  listarMisAlertasNoLeidas: async (): Promise<AlertaDTO[]> => {
    const response = await api.get<AlertaDTO[]>("/alertas/mis-alertas/no-leidas");
    return response.data;
  },

  /**
   * Contar mis alertas no leídas
   */
  contarNoLeidas: async (): Promise<number> => {
    const response = await api.get<ContadorAlertas>("/alertas/mis-alertas/contador");
    return response.data.noLeidas;
  },

  /**
   * Marcar una alerta como leída
   */
  marcarComoLeida: async (id: number): Promise<AlertaDTO> => {
    const response = await api.patch<AlertaDTO>(`/alertas/${id}/marcar-leida`);
    return response.data;
  },

  /**
   * Marcar todas las alertas como leídas
   */
  marcarTodasComoLeidas: async (): Promise<{ mensaje: string; cantidad: number }> => {
    const response = await api.patch<{ mensaje: string; cantidad: number }>(
      "/alertas/mis-alertas/marcar-todas-leidas"
    );
    return response.data;
  },

  /**
   * Obtener todas las alertas (solo admin)
   */
  listarTodas: async (): Promise<AlertaDTO[]> => {
    const response = await api.get<AlertaDTO[]>("/alertas/todas");
    return response.data;
  },

  /**
   * Obtener todas las alertas no leídas (solo admin)
   */
  listarTodasNoLeidas: async (): Promise<AlertaDTO[]> => {
    const response = await api.get<AlertaDTO[]>("/alertas/todas/no-leidas");
    return response.data;
  },
};

export default alertaService;