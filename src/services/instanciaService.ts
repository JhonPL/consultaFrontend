import api from "./api";

export interface InstanciaReporteDTO {
  id: number;
  reporteId: string;
  reporteNombre: string;
  entidadNombre: string;
  periodoReportado: string;
  fechaVencimientoCalculada: string;
  fechaEnvioReal: string | null;
  estado: string;
  prioridad: string;
  diasHastaVencimiento: number;
  diasDesviacion: number | null;
  enviado: boolean;
  vencido: boolean;
  responsableElaboracion: string;
  responsableSupervision: string;
  frecuencia: string;
  formatoRequerido: string | null;
  baseLegal: string | null;
  linkReporteFinal: string | null;
  linkEvidenciaEnvio: string | null;
  nombreArchivo: string | null;
  observaciones: string | null;
  enviadoPorNombre: string | null;
}

export interface FiltrosHistorico {
  entidadId?: number;
  year?: number;
  mes?: number;
}

const instanciaService = {
  listar: async (): Promise<InstanciaReporteDTO[]> => {
    const response = await api.get("/instancias");
    return response.data;
  },

  listarPendientes: async (): Promise<InstanciaReporteDTO[]> => {
    const response = await api.get("/instancias/pendientes");
    return response.data;
  },

  listarVencidos: async (): Promise<InstanciaReporteDTO[]> => {
    const response = await api.get("/instancias/vencidos");
    return response.data;
  },

  listarHistorico: async (filtros: FiltrosHistorico): Promise<InstanciaReporteDTO[]> => {
    const params = new URLSearchParams();
    if (filtros.entidadId) params.append("entidadId", filtros.entidadId.toString());
    if (filtros.year) params.append("year", filtros.year.toString());
    if (filtros.mes) params.append("mes", filtros.mes.toString());
    
    const response = await api.get(`/instancias/historico?${params.toString()}`);
    return response.data;
  },

  enviarReporte: async (
    instanciaId: number,
    archivo: File,
    observaciones?: string,
    linkEvidencia?: string
  ): Promise<InstanciaReporteDTO> => {
    const formData = new FormData();
    formData.append("archivo", archivo);
    if (observaciones) formData.append("observaciones", observaciones);
    if (linkEvidencia) formData.append("linkEvidenciaEnvio", linkEvidencia);

    const response = await api.post(
      `/instancias/${instanciaId}/enviar`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  enviarReporteConLink: async (
    instanciaId: number,
    linkReporte: string,
    observaciones?: string,
    linkEvidencia?: string
  ): Promise<InstanciaReporteDTO> => {
    const params = new URLSearchParams();
    params.append("linkReporteFinal", linkReporte);
    if (observaciones) params.append("observaciones", observaciones);
    if (linkEvidencia) params.append("linkEvidenciaEnvio", linkEvidencia);

    const response = await api.post(`/instancias/${instanciaId}/enviar-link?${params.toString()}`);
    return response.data;
  },
};

export default instanciaService;