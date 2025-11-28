import api from './api';

// Interface que coincide con el backend
export interface Entidad {
  id?: number;
  nit: string;
  razonSocial: string;
  paginaWeb?: string;
  baseLegal?: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

const entidadService = {
  /**
   * Listar todas las entidades
   */
  listar: async (): Promise<Entidad[]> => {
    const response = await api.get<Entidad[]>('/entidades');
    return response.data;
  },

  /**
   * Obtener entidad por ID
   */
  obtenerPorId: async (id: number): Promise<Entidad> => {
    const response = await api.get<Entidad>(`/entidades/${id}`);
    return response.data;
  },

  /**
   * Crear nueva entidad
   */
  crear: async (entidad: Entidad): Promise<Entidad> => {
    const response = await api.post<Entidad>('/entidades', entidad);
    return response.data;
  },

  /**
   * Actualizar entidad existente
   */
  actualizar: async (id: number, entidad: Entidad): Promise<Entidad> => {
    const response = await api.put<Entidad>(`/entidades/${id}`, entidad);
    return response.data;
  },

  /**
   * Eliminar entidad
   */
  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/entidades/${id}`);
  },
};

export default entidadService;