"use client"

import { useCallback } from "react"
import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { SparklesIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export type AnalyzerCommand = "/analyze" | "/summarize" | "/insight"

export type AnalyzerNodeData = {
  command: AnalyzerCommand
  output: string
}

export type AnalyzerNodeType = Node<AnalyzerNodeData, "analyzer">

const COMMANDS: AnalyzerCommand[] = ["/analyze", "/summarize", "/insight"]

export function AnalyzerNode({ id, data, selected }: NodeProps<AnalyzerNodeType>) {
  const { setNodes } = useReactFlow()

  const update = useCallback(
    (patch: Partial<AnalyzerNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      )
    },
    [id, setNodes],
  )

  return (
    <div
      className={cn(
        "w-80 rounded-xl border border-purple-200 bg-purple-50 shadow-xs transition-shadow dark:border-purple-800 dark:bg-purple-950/20",
        selected && "ring-2 ring-purple-400 shadow-md",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !rounded-full !border-2 !border-purple-400 !bg-background"
      />

      <header className="flex items-center gap-2 border-b border-purple-200 px-3 py-2 dark:border-purple-800">
        <HugeiconsIcon
          icon={SparklesIcon}
          size={12}
          strokeWidth={2}
          className="text-purple-500"
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
          AI Analyzer
        </span>
        <div className="ml-auto">
          <select
            className="nodrag bg-transparent text-[10px] font-medium text-purple-600 outline-none dark:text-purple-400 cursor-pointer"
            value={data.command}
            onChange={(e) => update({ command: e.target.value as AnalyzerCommand })}
          >
            {COMMANDS.map((cmd) => (
              <option key={cmd} value={cmd}>
                {cmd}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="nowheel min-h-[100px] p-3">
        {data.output ? (
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-purple-900 dark:text-purple-100">
            {data.output}
          </p>
        ) : (
          <p className="text-xs text-purple-400/60">
            Connect SQL and Text nodes, then run to generate analysis…
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !rounded-full !border-2 !border-purple-400 !bg-background"
      />
    </div>
  )
}
