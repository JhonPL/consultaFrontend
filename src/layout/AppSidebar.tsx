import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  GridIcon,
  CalenderIcon,
  UserCircleIcon,
  PieChartIcon,
  ListIcon,
  HorizontaLDots,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";

// ======== MENUS POR ROL (segun documentacion del sistema) ======== //
const menuByRole: Record<string, { name: string; icon: React.ReactNode; path: string }[]> = {
  // ADMINISTRADOR: Acceso completo
  administrador: [
    { icon: <GridIcon />, name: "Dashboard Global", path: "/" },
    { icon: <ListIcon />, name: "Gestion de Reportes", path: "/reportes" },
    { icon: <UserCircleIcon />, name: "Usuarios y Roles", path: "/usuarios" },
    { icon: <HorizontaLDots />, name: "Gestion de Entidades", path: "/entidades" },
    { icon: <CalenderIcon />, name: "Calendario", path: "/calendario" },
    { icon: <PieChartIcon />, name: "Historico / Trazabilidad", path: "/historico" },
  ],
  
  // SUPERVISOR DE CUMPLIMIENTO: Ve solo lo que supervisa
  supervisor: [
    { icon: <GridIcon />, name: "Dashboard", path: "/" },
    { icon: <ListIcon />, name: "Gestor de Reportes", path: "/supervision" },
    { icon: <CalenderIcon />, name: "Calendario", path: "/calendario" },
    { icon: <PieChartIcon />, name: "Historico / Trazabilidad", path: "/historico" },
  ],
  
  // RESPONSABLE DE REPORTES: Solo sus reportes asignados
  responsable: [
    { icon: <GridIcon />, name: "Mi Dashboard", path: "/" },
    { icon: <ListIcon />, name: "Mis Reportes", path: "/mis-reportes" },
    { icon: <CalenderIcon />, name: "Mi Calendario", path: "/calendario" },
  ],
  
  // AUDITOR: Solo lectura con graficas de cumplimiento
  auditor: [
    { icon: <GridIcon />, name: "Dashboard", path: "/" },
    { icon: <PieChartIcon />, name: "Auditoria y Metricas", path: "/auditoria" },
    { icon: <ListIcon />, name: "Historico / Trazabilidad", path: "/historico" },
  ],
};

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.role || "administrador"; // fallback temporal
  const navItems = menuByRole[role] || [];

  const [activePath, setActivePath] = useState(location.pathname);
  const isActive = useCallback((path: string) => activePath === path, [activePath]);

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location]);

  const renderMenuItems = (items: typeof navItems) => (
    <ul className="flex flex-col gap-2">
      {items.map((nav) => (
        <li key={nav.name}>
          <Link
            to={nav.path}
            className={`menu-item group ${
              isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
            }`}
          >
            <span
              className={`menu-item-icon-size ${
                isActive(nav.path)
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
              }`}
            >
              {nav.icon}
            </span>
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="menu-item-text">{nav.name}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
      ${
        isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
          ? "w-[290px]"
          : "w-[90px]"
      }
      ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
      lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo-llanogas.png"
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-llanogas2.png"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/llanogas-pes.ico"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      {/* Menu principal */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu Principal"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems)}
            </div>
          </div>
        </nav>
      </div>

      {/* Info del usuario */}
      {(isExpanded || isHovered || isMobileOpen) && user && (
        <div className="mt-auto pb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="px-2">
            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
              {user.nombre}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {user.role}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}