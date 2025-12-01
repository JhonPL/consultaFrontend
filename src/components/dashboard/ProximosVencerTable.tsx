import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";

interface ProximoVencer {
  id: string;
  reporteNombre: string;
  entidadNombre: string;
  fechaVencimiento: string;
  diasRestantes: number;
  responsable: string;
}

interface ProximosVencerTableProps {
  reportes: ProximoVencer[];
  onVerTodos?: () => void;
}

export default function ProximosVencerTable({ reportes, onVerTodos }: ProximosVencerTableProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const str = String(dateString).trim();
    const dayMatch = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(str);
    if (dayMatch) {
      const dt = new Date(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3]));
      return dt.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
    }
    const monthMatch = /^\s*(\d{4})-(\d{2})\s*$/.exec(str);
    if (monthMatch) {
      const dt = new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
      return dt.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
    return "-";
  };

  const getBadgeColor = (dias: number) => {
    if (dias <= 1) return "error";
    if (dias <= 3) return "warning";
    return "primary";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            ⏰ Próximos a Vencer
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Reportes que vencen en los próximos 7 días
          </p>
        </div>

        {onVerTodos && (
          <button 
            onClick={onVerTodos}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            Ver calendario
          </button>
        )}
      </div>
      
      <div className="max-w-full overflow-x-auto">
        {reportes.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              ¡Excelente! No hay reportes próximos a vencer
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Reporte
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Entidad
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Vencimiento
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Responsable
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Estado
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {reportes.slice(0, 5).map((reporte) => (
                <TableRow key={reporte.id}>
                  <TableCell className="py-3">
                    <div>
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {reporte.reporteNombre ?? (reporte as any).nombre ?? reporte.id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {reporte.entidadNombre ?? (reporte as any).entidad ?? "-"}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {formatDate(reporte.fechaVencimiento)}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {reporte.responsable}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge size="sm" color={getBadgeColor(reporte.diasRestantes)}>
                      {reporte.diasRestantes <= 0 
                        ? "¡Hoy!" 
                        : reporte.diasRestantes === 1 
                        ? "Mañana" 
                        : `${reporte.diasRestantes} días`}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}