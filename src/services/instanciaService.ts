import api from './api';

export interface InstanciaReporteDTO {
  id: number;
  
  // Datos del reporte
  reporteId: string;
  reporteNombre: string;
  entidadNombre: string;
  entidadId: number;
  frecuencia: string;
  formatoRequerido: string;
  baseLegal: string;
  
  // Datos de la instancia
  periodoReportado: string;
  fechaVencimientoCalculada: string;
  fechaEnvioReal: string | null;
  estadoNombre: string;
  estadoId: number;
  diasDesviacion: number | null;
  diasHastaVencimiento?: number;
  
  // Archivos y links
  linkReporteFinal: string | null;
  linkEvidenciaEnvio: string | null;
  nombreArchivo: string | null;
  driveFileId: string | null;
  
  // Usuario - responsables
  responsableElaboracion: string;
  responsableElaboracionId: number;
  responsableSupervision: string;
  responsableSupervisionId: number;
  enviadoPorNombre: string | null;
  enviadoPorId: number | null;
  
  // Otros
  observaciones: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  
  // Estado calculado
  prioridad: string;
  vencido: boolean;
  enviado: boolean;
}

export interface FiltrosHistorico {
  reporteId?: string;
  entidadId?: number;
  year?: number;
  mes?: number;
}

const instanciaService = {
  /**
   * Listar todas las instancias
   */
  listar: async (): Promise<InstanciaReporteDTO[]> => {
    const response = await api.get<InstanciaReporteDTO[]>('/instancias');
    return response.data;
  },

  /**
   * Obtener una instancia por ID
   */
  obtenerPorId: async (id: number): Promise<InstanciaReporteDTO> => {
    const response = await api.get<InstanciaReporteDTO>(`/instancias/${id}`);
    return response.data;
  },

  /**
   * Listar instancias pendientes
   */
  listarPendientes: async (): Promise<InstanciaReporteDTO[]> => {
    const response = await api.get<InstanciaReporteDTO[]>('/instancias/pendientes');
    return response.data;
  },

  /**
   * Listar instancias vencidas
   */
  listarVencidos: async (): Promise<InstanciaReporteDTO[]> => {
    const response = await api.get<InstanciaReporteDTO[]>('/instancias/vencidos');
    return response.data;
  },

  /**
   * Listar historico de reportes enviados
   */
  listarHistorico: async (filtros?: FiltrosHistorico): Promise<InstanciaReporteDTO[]> => {
    const params = new URLSearchParams();
    if (filtros?.reporteId) params.append('reporteId', filtros.reporteId);
    if (filtros?.entidadId) params.append('entidadId', filtros.entidadId.toString());
    if (filtros?.year) params.append('year', filtros.year.toString());
    if (filtros?.mes) params.append('mes', filtros.mes.toString());
    
    const response = await api.get<InstanciaReporteDTO[]>(`/instancias/historico?${params}`);
    return response.data;
  },

  /**
   * Enviar reporte con archivo
   */
  enviarReporte: async (
    id: number,
    archivo: File,
    observaciones?: string,
    linkEvidencia?: string
  ): Promise<InstanciaReporteDTO> => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (observaciones) formData.append('observaciones', observaciones);
    if (linkEvidencia) formData.append('linkEvidencia', linkEvidencia);
    
    const response = await api.post<InstanciaReporteDTO>(
      `/instancias/${id}/enviar`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Enviar reporte solo con link (sin archivo)
   */
  enviarReporteConLink: async (
    id: number,
    linkReporte: string,
    observaciones?: string,
    linkEvidencia?: string
): Promise<InstanciaReporteDTO> => {
    const payload = { linkReporte, observaciones, linkEvidencia };

    try {
      try { console.log('[DEBUG instanciaService] enviarReporteConLink payload=', payload); } catch {}
      const response = await api.post<InstanciaReporteDTO>(`/instancias/${id}/enviar-link`, payload);
      try { console.log('[DEBUG instanciaService] enviarReporteConLink response=', response.data); } catch {}

      // ⭐⭐⭐ ESTA LÍNEA ES LA QUE FALTABA ⭐⭐⭐
      window.dispatchEvent(new Event("reportes:updated"));

      return response.data;
    } catch (err) {
      try { console.error('[DEBUG instanciaService] enviarReporteConLink error=', (err as any)?.response?.data || err); } catch {}
      throw err;
    }
  },

  /**
   * Verificar estado de Google Drive
   */
  verificarDriveStatus: async (): Promise<{ enabled: boolean; message: string }> => {
    const response = await api.get<{ enabled: boolean; message: string }>('/instancias/drive-status');
    return response.data;
  },

  /**
   * Listar instancias por reporte
   */
  listarPorReporte: async (reporteId: string): Promise<InstanciaReporteDTO[]> => {
    const response = await api.get<InstanciaReporteDTO[]>(`/instancias/reporte/${reporteId}`);
    return response.data;
  },

  /**
   * Aprobar un reporte (supervisor)
   */
  aprobar: async (id: number, observaciones?: string): Promise<InstanciaReporteDTO> => {
    const response = await api.post<InstanciaReporteDTO>(`/instancias/${id}/aprobar`, {
      observaciones
    });
    return response.data;
  },

  /**
   * Rechazar/devolver un reporte (supervisor)
   */
  rechazar: async (id: number, motivo: string): Promise<InstanciaReporteDTO> => {
    const response = await api.post<InstanciaReporteDTO>(`/instancias/${id}/rechazar`, {
      motivo
    });
    return response.data;
  },
};

export default instanciaService;
