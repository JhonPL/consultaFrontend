import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";

interface ReporteVencido {
  id: string;
  reporteNombre: string; // nombre del reporte según servicio
  entidadNombre: string; // nombre de la entidad según servicio
  fechaVencimiento: string;
  diasVencido: number;
  responsable: string;
}

interface VencidosTableProps {
  reportes: ReporteVencido[];
  onVerTodos?: () => void;
}

export default function VencidosTable({ reportes, onVerTodos }: VencidosTableProps) {
  const parseDateLocal = (s?: string | null) => {
    if (!s) return null;
    const str = String(s).trim();
    const dayMatch = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(str);
    if (dayMatch) return new Date(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3]));
    const monthMatch = /^\s*(\d{4})-(\d{2})\s*$/.exec(str);
    if (monthMatch) return new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
    const d = new Date(str);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = parseDateLocal(dateString);
    if (!date) return "-";
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-red-200 bg-white px-4 pb-3 pt-4 dark:border-red-800/50 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
            🚨 Reportes Vencidos
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Requieren atención inmediata
          </p>
        </div>

        {onVerTodos && reportes.length > 0 && (
          <button 
            onClick={onVerTodos}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-red-600 shadow-theme-xs hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400"
          >
            Ver todos
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
              ¡Perfecto! No hay reportes vencidos
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-red-100 dark:border-red-800/30 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Reporte
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Entidad
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Venció
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Responsable
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Días
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-red-100 dark:divide-red-800/30">
              {reportes.slice(0, 5).map((reporte) => (
                <TableRow key={reporte.id} className="bg-red-50/50 dark:bg-red-900/10">
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
                  <TableCell className="py-3 text-red-500 text-theme-sm font-medium">
                    {formatDate(reporte.fechaVencimiento)}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {reporte.responsable}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge size="sm" color="error">
                      {(() => {
                        const diasVal =
                          typeof reporte.diasVencido === "number"
                            ? reporte.diasVencido
                            : (reporte as any).diasVencido ?? (reporte as any).dias ?? null;
                        if (diasVal === null || diasVal === undefined) return "-";
                        return `${diasVal} ${diasVal === 1 ? "día" : "días"}`;
                      })()}
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