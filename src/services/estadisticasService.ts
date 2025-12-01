import api from "./api";

export interface EstadisticasDTO {
  totalObligaciones: number;
  totalEnviadosATiempo: number;
  totalVencidos: number;
  totalPendientes: number;
  porcentajeCumplimientoATiempo: number;
  reportesProximosVencer7Dias: number;
  entidadMayorIncumplimiento?: string;
  incumplimientosEntidadProblema?: number;
  responsableMayorIncumplimiento?: string;
  incumplimientosResponsableProblema?: number;
}

export interface ProximosVencerDTO {
  reportes: Array<{
    id: number;
    reporteNombre: string;
    entidadNombre: string;
    periodoReportado: string;
    fechaVencimiento: string;
    diasRestantes: number;
    responsable: string;
  }>;
}

export interface VencidosDTO {
  reportes: Array<{
    id: number;
    reporteNombre: string;
    entidadNombre: string;
    periodoReportado: string;
    fechaVencimiento: string;
    diasVencido: number;
    responsable: string;
  }>;
}

const estadisticasService = {
  // ============ ADMIN - Ve todo ============
  obtenerDashboard: async (): Promise<EstadisticasDTO> => {
    const response = await api.get("/estadisticas/dashboard");
    return response.data;
  },

  obtenerProximosVencer: async (dias: number = 7): Promise<ProximosVencerDTO> => {
    const response = await api.get(`/estadisticas/proximos-vencer?dias=${dias}`);
    return response.data;
  },

  obtenerVencidos: async (): Promise<VencidosDTO> => {
    const response = await api.get("/estadisticas/vencidos");
    return response.data;
  },

  // ============ SUPERVISOR - Solo sus supervisados ============
  obtenerDashboardSupervisor: async (supervisorId: number): Promise<EstadisticasDTO> => {
    try {
      const response = await api.get(`/estadisticas/dashboard/supervisor/${supervisorId}`);
      return response.data;
    } catch (error) {
      // Fallback al endpoint general si no existe el específico
      const response = await api.get("/estadisticas/dashboard");
      return response.data;
    }
  },

  obtenerProximosVencerSupervisor: async (supervisorId: number, dias: number = 7): Promise<ProximosVencerDTO> => {
    try {
      const response = await api.get(`/estadisticas/proximos-vencer/supervisor/${supervisorId}?dias=${dias}`);
      return response.data;
    } catch (error) {
      const response = await api.get(`/estadisticas/proximos-vencer?dias=${dias}`);
      return response.data;
    }
  },

  obtenerVencidosSupervisor: async (supervisorId: number): Promise<VencidosDTO> => {
    try {
      const response = await api.get(`/estadisticas/vencidos/supervisor/${supervisorId}`);
      return response.data;
    } catch (error) {
      const response = await api.get("/estadisticas/vencidos");
      return response.data;
    }
  },

  // ============ RESPONSABLE - Solo sus reportes ============
  obtenerDashboardResponsable: async (responsableId: number): Promise<EstadisticasDTO> => {
    try {
      const response = await api.get(`/estadisticas/dashboard/responsable/${responsableId}`);
      return response.data;
    } catch (error) {
      // Fallback al endpoint general si no existe el específico
      const response = await api.get("/estadisticas/dashboard");
      return response.data;
    }
  },

  obtenerProximosVencerResponsable: async (responsableId: number, dias: number = 7): Promise<ProximosVencerDTO> => {
    try {
      const response = await api.get(`/estadisticas/proximos-vencer/responsable/${responsableId}?dias=${dias}`);
      return response.data;
    } catch (error) {
      const response = await api.get(`/estadisticas/proximos-vencer?dias=${dias}`);
      return response.data;
    }
  },
};

export default estadisticasService;
