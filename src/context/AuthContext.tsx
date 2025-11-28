import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";

// Mapeo de roles del backend a roles del frontend
const roleMapping: Record<string, string> = {
  "ROLE_ADMINISTRADOR": "administrador",
  "ROLE_RESPONSABLE": "responsable", 
  "ROLE_SUPERVISOR": "supervisor",
  "ROLE_AUDITOR": "auditor",
  "Administrador": "administrador",
  "Responsable": "responsable",
  "Supervisor": "supervisor",
  "Auditor": "auditor",
};

// Tipo de rol para el frontend
type Role = "administrador" | "responsable" | "supervisor" | "auditor";

// Interface del usuario para el frontend
interface AuthUser {
  email: string;
  nombre: string;
  role: Role;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Al cargar, verificar si hay una sesión guardada
  useEffect(() => {
    const savedUser = authService.getCurrentUser();
    if (savedUser && authService.isAuthenticated()) {
      const normalizedRole = (roleMapping[savedUser.rol] || savedUser.rol.toLowerCase()) as Role;
      setUser({ 
        email: savedUser.email, 
        nombre: savedUser.nombre,
        role: normalizedRole 
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(email, password);
      
      // Guardar token en localStorage
      localStorage.setItem('token', response.token);
      
      // Normalizar el rol para el frontend
      const normalizedRole = (roleMapping[response.rol] || response.rol.toLowerCase()) as Role;
      
      const userData: AuthUser = {
        email: email,
        nombre: response.nombre,
        role: normalizedRole,
      };
      
      setUser(userData);
      
      // Guardar usuario en localStorage
      localStorage.setItem('user', JSON.stringify({
        email: email,
        nombre: response.nombre,
        rol: normalizedRole,
      }));
      
      navigate("/");
    } catch (err: any) {
      console.error("Error de login:", err);
      
      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message || err.response.data?.error;
        
        if (status === 401) {
          setError("Credenciales incorrectas. Verifique su correo y contraseña.");
        } else if (status === 403) {
          setError("Usuario inactivo o sin permisos de acceso.");
        } else if (status === 404) {
          setError("Usuario no encontrado.");
        } else {
          setError(message || "Error al iniciar sesión. Intente nuevamente.");
        }
      } else if (err.request) {
        setError("No se puede conectar con el servidor. Verifique que el backend esté ejecutándose.");
      } else {
        setError("Error inesperado. Intente nuevamente.");
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setError(null);
    navigate("/signin");
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};