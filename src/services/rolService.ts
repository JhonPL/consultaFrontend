import api from './api';

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
}

const rolService = {
  /**
   * Listar todos los roles
   */
  listar: async (): Promise<Rol[]> => {
    const response = await api.get<Rol[]>('/roles');
    return response.data;
  },

  /**
   * Obtener rol por ID
   */
  obtenerPorId: async (id: number): Promise<Rol> => {
    const response = await api.get<Rol>(`/roles/${id}`);
    return response.data;
  },
};

export default rolService;