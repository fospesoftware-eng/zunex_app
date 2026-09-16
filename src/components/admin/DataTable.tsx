"use client";

interface Props<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  renderActions?: (row: T) => React.ReactNode;
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (v: string) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  onEdit,
  onDelete,
  renderActions,
  search,
  onSearchChange,
  emptyMessage = "No data yet",
  loading = false,
}: Props<T>) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 font-medium text-[11px] uppercase tracking-[0.14em] text-paper-dim ${col.headerClassName ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete || renderActions) && (
                <th className="text-right px-4 py-3 font-medium text-[11px] uppercase tracking-[0.14em] text-paper-dim w-28">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-paper-dim">
                  Loading…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-paper-dim">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-white/5 hover:bg-white/[0.025] transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-paper ${col.cellClassName ?? ""}`}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                  {(onEdit || onDelete || renderActions) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {renderActions
                          ? renderActions(row)
                          : onEdit && (
                              <button
                                onClick={() => onEdit(row)}
                                className="p-1.5 rounded-lg text-paper-dim hover:text-paper hover:bg-white/8 transition"
                                aria-label="Edit"
                              >
                                ✎
                              </button>
                            )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="p-1.5 rounded-lg text-paper-dim hover:text-ember-400 hover:bg-ember-500/10 transition"
                            aria-label="Delete"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {onSearchChange && search !== undefined && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter…"
            className="h-9 w-full rounded-lg bg-black/30 border border-white/10 px-3 text-sm text-paper placeholder:text-paper-dim/50 focus:outline-none focus:border-[#4a63ff]"
          />
        </div>
      )}
    </div>
  );
}
