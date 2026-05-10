"use client"

import { useCallback } from "react"
import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react"
import { cn } from "@/lib/utils"

export type TextNodeData = { markdown: string }
export type TextNodeType = Node<TextNodeData, "text">

export function TextNode({ id, data, selected }: NodeProps<TextNodeType>) {
  const { setNodes } = useReactFlow()

  const handleChange = useCallback(
    (value: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, markdown: value } } : n)),
      )
    },
    [id, setNodes],
  )

  return (
    <div
      className={cn(
        "w-60 rounded-xl border bg-card shadow-xs transition-shadow",
        selected && "ring-2 ring-ring shadow-md",
      )}
    >
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <span className="size-2 rounded-full bg-foreground/25" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Text
        </span>
      </header>

      <div className="p-3">
        <textarea
          className="nodrag nowheel w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/40"
          placeholder="Write a hypothesis, context, or business rule…"
          rows={4}
          value={data.markdown}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !rounded-full !border-2 !border-foreground/30 !bg-background"
      />
    </div>
  )
}
