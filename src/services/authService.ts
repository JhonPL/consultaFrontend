import api from './api';

// Respuesta del backend (campos exactos que devuelve)
export interface LoginResponse {
  token: string;
  rol: string;
  nombre: string;
  usuarioId: number;
}

export interface User {
  id?: number;
  email: string;
  nombre: string;
  rol: string;
}

// Servicio de autenticación
const authService = {
  /**
   * Iniciar sesión
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // Enviar con los nombres que espera el backend
    const response = await api.post<LoginResponse>('/auth/login', {
      correo: email,
      contrasena: password
    });
    return response.data;
  },

  /**
   * Obtener usuario actual desde el token almacenado
   */
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Cerrar sesión
   */
  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Verificar si hay sesión activa
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  /**
   * Obtener el token actual
   */
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },
};

export default authService;