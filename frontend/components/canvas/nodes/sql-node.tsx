"use client"

import { useState, useCallback } from "react"
import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ComputerTerminalIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export type SQLResult = { columns: string[]; rows: (string | number)[][] } | null

export type ChartType = "table" | "bar" | "line" | "pie" | "stacked" | "metric"

export type SQLNodeData = {
  question: string
  sql: string
  result: SQLResult
  chartType: ChartType
}

export type SQLNodeType = Node<SQLNodeData, "sql">

type ViewMode = "table" | "chart" | "sql"

export function SQLNode({ id, data, selected }: NodeProps<SQLNodeType>) {
  const { setNodes } = useReactFlow()
  const [view, setView] = useState<ViewMode>("table")

  const update = useCallback(
    (patch: Partial<SQLNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      )
    },
    [id, setNodes],
  )

  return (
    <div
      className={cn(
        "w-80 rounded-xl border border-blue-200 bg-blue-50 shadow-xs transition-shadow dark:border-blue-800 dark:bg-blue-950/20",
        selected && "ring-2 ring-blue-400 shadow-md",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !rounded-full !border-2 !border-blue-400 !bg-background"
      />

      <header className="flex items-center gap-2 border-b border-blue-200 px-3 py-2 dark:border-blue-800">
        <HugeiconsIcon
          icon={ComputerTerminalIcon}
          size={12}
          strokeWidth={2}
          className="text-blue-500"
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          SQL
        </span>
      </header>

      <div className="border-b border-blue-200 px-3 py-2 dark:border-blue-800">
        <input
          className="nodrag w-full bg-transparent text-sm outline-none placeholder:text-blue-400/50"
          placeholder="Describe what you want to know…"
          value={data.question}
          onChange={(e) => update({ question: e.target.value })}
        />
      </div>

      {/* View toggle */}
      <div className="flex gap-0.5 border-b border-blue-200 px-3 py-1.5 dark:border-blue-800">
        {(["table", "chart", "sql"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "nodrag rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
              view === v
                ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                : "text-blue-400 hover:text-blue-600 dark:text-blue-500",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[80px]">
        {view === "table" && <TableView result={data.result} />}
        {view === "sql" && (
          <div className="p-3">
            <textarea
              className="nodrag nowheel w-full resize-none bg-transparent font-mono text-[11px] leading-relaxed text-blue-900 outline-none placeholder:text-blue-400/50 dark:text-blue-100"
              rows={5}
              placeholder="Generated SQL appears here — you can edit it…"
              value={data.sql}
              onChange={(e) => update({ sql: e.target.value })}
            />
          </div>
        )}
        {view === "chart" && (
          <div className="flex h-20 items-center justify-center">
            <span className="text-xs text-blue-400">Chart — run query first</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !rounded-full !border-2 !border-blue-400 !bg-background"
      />
    </div>
  )
}

function TableView({ result }: { result: SQLResult }) {
  if (!result) {
    return (
      <div className="flex h-20 items-center justify-center">
        <span className="text-xs text-blue-400">No results — run the query</span>
      </div>
    )
  }

  return (
    <div className="nowheel max-h-48 overflow-auto p-2">
      <table className="w-full text-[11px]">
        <thead>
          <tr>
            {result.columns.map((col) => (
              <th
                key={col}
                className="px-1.5 py-1 text-left font-semibold text-blue-700 dark:text-blue-300"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="border-t border-blue-100 dark:border-blue-900/50">
              {row.map((cell, j) => (
                <td key={j} className="px-1.5 py-1 text-blue-900 dark:text-blue-100">
                  {typeof cell === "number" ? cell.toLocaleString() : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
