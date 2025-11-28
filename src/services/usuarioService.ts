import api from './api';

// Interfaces que coinciden con el backend
export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Usuario {
  id?: number;
  cedula: string;
  nombreCompleto: string;
  correo: string;
  contrasena?: string;
  proceso: string;
  cargo: string;
  telefono?: string;
  rol: Rol;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

// Para crear/actualizar usuario
export interface UsuarioRequest {
  cedula: string;
  nombreCompleto: string;
  correo: string;
  contrasena?: string;
  proceso: string;
  cargo: string;
  telefono?: string;
  rol: { id: number };
  activo: boolean;
}

const usuarioService = {
  /**
   * Listar todos los usuarios
   */
  listar: async (): Promise<Usuario[]> => {
    const response = await api.get<Usuario[]>('/usuarios');
    return response.data;
  },

  /**
   * Obtener usuario por ID
   */
  obtenerPorId: async (id: number): Promise<Usuario> => {
    const response = await api.get<Usuario>(`/usuarios/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo usuario
   */
  crear: async (usuario: UsuarioRequest): Promise<Usuario> => {
    const response = await api.post<Usuario>('/usuarios', usuario);
    return response.data;
  },

  /**
   * Actualizar usuario existente
   */
  actualizar: async (id: number, usuario: UsuarioRequest): Promise<Usuario> => {
    const response = await api.put<Usuario>(`/usuarios/${id}`, usuario);
    return response.data;
  },

  /**
   * Eliminar usuario
   */
  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/usuarios/${id}`);
  },
};

export default usuarioService;