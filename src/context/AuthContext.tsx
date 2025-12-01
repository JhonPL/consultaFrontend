import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import api from "../services/api";

export type Role = "administrador" | "supervisor" | "responsable" | "auditor";

interface User {
  id: number;
  email: string;
  nombre: string;
  role: Role;
  rolOriginal: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mapeo de roles del backend a roles del frontend
const mapearRol = (rolBackend: string): Role => {
  const rolUpper = rolBackend?.toUpperCase() || "";
  
  if (rolUpper.includes("ADMIN")) return "administrador";
  if (rolUpper.includes("SUPERVISOR") || rolUpper.includes("SUPERV")) return "supervisor";
  if (rolUpper.includes("RESPONSABLE") || rolUpper.includes("ELABOR")) return "responsable";
  if (rolUpper.includes("AUDITOR") || rolUpper.includes("CONSULTA") || rolUpper.includes("AUDIT")) return "auditor";
  
  return "responsable"; // Default
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar sesión al cargar
  useEffect(() => {
    const verificarSesion = () => {
      try {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");
        
        if (token && userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } else {
          // Limpiar cualquier dato residual
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch (error) {
        console.error("Error verificando sesión:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verificarSesion();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", {
        correo: email,
        contrasena: password,
      });

      const { token, rol, nombre, usuarioId } = response.data;

      // Guardar token
      localStorage.setItem("token", token);

      // Crear objeto de usuario
      const userData: User = {
        id: usuarioId,
        email: email,
        nombre: nombre,
        role: mapearRol(rol),
        rolOriginal: rol,
      };

      // Guardar usuario
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      const mensaje = error.response?.data?.message || 
                     error.response?.data?.error || 
                     "Credenciales inválidas";
      throw new Error(mensaje);
    }
  };

  const logout = useCallback(() => {
    // Limpiar todo el localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Limpiar estado
    setUser(null);
    
    // Limpiar historial del navegador para evitar volver atrás
    // Reemplazar el historial actual con la página de login
    window.history.replaceState(null, "", "/signin");
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}

// Hook para verificar permisos
export function useHasPermission(allowedRoles: Role[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

// Hook para obtener el rol actual
export function useRole(): Role | null {
  const { user } = useAuth();
  return user?.role || null;
}