"use client"

import { useState, useCallback } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { TextNode } from "@/components/canvas/nodes/text-node"
import { SQLNode } from "@/components/canvas/nodes/sql-node"
import { AnalyzerNode } from "@/components/canvas/nodes/analyzer-node"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CommandIcon,
  ArrowRight01Icon,
  Share03Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons"

// ─── node types ───────────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  text: TextNode,
  sql: SQLNode,
  analyzer: AnalyzerNode,
}

// ─── mock schema ──────────────────────────────────────────────────────────────

const MOCK_SCHEMA = [
  {
    name: "users",
    rowCount: 2412,
    columns: [
      { name: "id", type: "NUMBER" as const },
      { name: "email", type: "TEXT" as const },
      { name: "name", type: "TEXT" as const },
      { name: "plan", type: "TEXT" as const },
      { name: "created_at", type: "TEXT" as const },
    ],
  },
  {
    name: "orders",
    rowCount: 18247,
    columns: [
      { name: "id", type: "NUMBER" as const },
      { name: "user_id", type: "NUMBER" as const, fk: "users.id" },
      { name: "amount", type: "NUMBER" as const },
      { name: "status", type: "TEXT" as const },
      { name: "created_at", type: "TEXT" as const },
    ],
  },
  {
    name: "products",
    rowCount: 342,
    columns: [
      { name: "id", type: "NUMBER" as const },
      { name: "name", type: "TEXT" as const },
      { name: "price", type: "NUMBER" as const },
      { name: "category", type: "TEXT" as const },
      { name: "stock", type: "NUMBER" as const },
    ],
  },
  {
    name: "events",
    rowCount: 89541,
    columns: [
      { name: "id", type: "NUMBER" as const },
      { name: "user_id", type: "NUMBER" as const, fk: "users.id" },
      { name: "event_type", type: "TEXT" as const },
      { name: "properties", type: "TEXT" as const },
      { name: "created_at", type: "TEXT" as const },
    ],
  },
]

// ─── initial canvas state ─────────────────────────────────────────────────────

const INITIAL_NODES: Node[] = [
  {
    id: "1",
    type: "text",
    position: { x: 60, y: 160 },
    data: {
      markdown:
        "Hypothesis: Revenue dropped in March due to a spike in churn from free-plan users.",
    },
  },
  {
    id: "2",
    type: "sql",
    position: { x: 340, y: 60 },
    data: {
      question: "Monthly revenue for the last 12 months",
      sql: "SELECT DATE_TRUNC('month', created_at)::text AS month,\n  SUM(amount) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY 1\nORDER BY 1 DESC\nLIMIT 12;",
      result: {
        columns: ["month", "revenue"],
        rows: [
          ["2025-04", 15800],
          ["2025-03", 9800],
          ["2025-02", 14200],
          ["2025-01", 12400],
        ],
      },
      chartType: "bar",
    },
  },
  {
    id: "3",
    type: "sql",
    position: { x: 340, y: 290 },
    data: {
      question: "Churn by plan last 3 months",
      sql: "SELECT plan, COUNT(*) AS churned\nFROM users\nWHERE churned_at >= NOW() - INTERVAL '3 months'\nGROUP BY plan\nORDER BY 2 DESC;",
      result: {
        columns: ["plan", "churned"],
        rows: [
          ["free", 142],
          ["pro", 18],
          ["enterprise", 2],
        ],
      },
      chartType: "bar",
    },
  },
  {
    id: "4",
    type: "analyzer",
    position: { x: 700, y: 170 },
    data: {
      command: "/analyze",
      output:
        "Revenue dropped 31% in March ($14.2k → $9.8k). The drop correlates strongly with a 7.4× higher churn rate among free-plan users (142 vs 18 for Pro). This suggests the free tier's value cap was reached — users who couldn't justify upgrading churned instead of converting.",
    },
  },
]

const INITIAL_EDGES: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#94a3b8", strokeWidth: 1.5 },
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#94a3b8", strokeWidth: 1.5 },
  },
  {
    id: "e2-4",
    source: "2",
    target: "4",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#94a3b8", strokeWidth: 1.5 },
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#94a3b8", strokeWidth: 1.5 },
  },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatRowCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function hasPath(edges: Edge[], from: string, to: string): boolean {
  const visited = new Set<string>()
  const queue = [from]
  while (queue.length) {
    const curr = queue.shift()!
    if (curr === to) return true
    if (visited.has(curr)) continue
    visited.add(curr)
    edges.filter((e) => e.source === curr).forEach((e) => queue.push(e.target))
  }
  return false
}

// ─── panel components ─────────────────────────────────────────────────────────

function DBPanel() {
  return (
    <div className="w-64 rounded-xl border bg-card p-3 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        DB Connection
      </p>
      <div className="mb-1 flex items-center gap-2">
        <span className="size-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium">Connected</span>
      </div>
      <p className="mb-3 font-mono text-[11px] text-muted-foreground">
        postgresql://localhost:5432/prod
      </p>
      <Button variant="outline" size="sm" className="w-full">
        Reconnect
      </Button>
    </div>
  )
}

interface SyncPanelProps {
  lastSynced: Date
  syncSchedule: string
  setSyncSchedule: (v: string) => void
}

function SyncPanel({ lastSynced, syncSchedule, setSyncSchedule }: SyncPanelProps) {
  return (
    <div className="w-52 rounded-xl border bg-card p-3 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Sync
      </p>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Last synced {formatTimeAgo(lastSynced)}
      </p>
      <Button className="w-full" size="sm">
        Sync Now
      </Button>
      <select
        value={syncSchedule}
        onChange={(e) => setSyncSchedule(e.target.value)}
        className="mt-2 w-full cursor-pointer rounded border bg-transparent px-2 py-1 text-xs text-muted-foreground outline-none"
      >
        <option value="manual">Manual</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
    </div>
  )
}

interface SchemaPanelProps {
  expandedTables: Set<string>
  toggleTable: (name: string) => void
}

function SchemaPanel({ expandedTables, toggleTable }: SchemaPanelProps) {
  return (
    <div className="w-52 rounded-xl border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Schema
        </span>
        <span className="text-[10px] text-muted-foreground/50">
          {MOCK_SCHEMA.length} tables
        </span>
      </div>
      <div className="max-h-80 overflow-y-auto py-1">
        {MOCK_SCHEMA.map((table) => (
          <div key={table.name}>
            <button
              onClick={() => toggleTable(table.name)}
              className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
            >
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={10}
                strokeWidth={2.5}
                className={cn(
                  "shrink-0 text-muted-foreground/50 transition-transform",
                  expandedTables.has(table.name) && "rotate-90",
                )}
              />
              <span className="truncate font-medium">{table.name}</span>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/50">
                {formatRowCount(table.rowCount)}
              </span>
            </button>

            {expandedTables.has(table.name) && (
              <div className="pb-1 pl-6">
                {table.columns.map((col) => (
                  <div key={col.name} className="flex items-center gap-1.5 px-2 py-0.5">
                    <span className="truncate text-xs text-muted-foreground">{col.name}</span>
                    {"fk" in col && col.fk && (
                      <span className="shrink-0 text-[9px] text-muted-foreground/40">
                        → {col.fk}
                      </span>
                    )}
                    <span
                      className={cn(
                        "ml-auto shrink-0 rounded px-1 font-mono text-[9px] font-medium",
                        col.type === "NUMBER"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ContextPanel() {
  return (
    <div className="w-52 rounded-xl border bg-card p-3 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Context (RAG)
      </p>
      <Button variant="outline" size="sm" className="w-full">
        Upload
      </Button>
      <p className="mt-3 text-center text-[11px] text-muted-foreground/50">
        No documents yet
      </p>
    </div>
  )
}

interface SharePanelProps {
  isPublic: boolean
  setIsPublic: (v: boolean) => void
}

function SharePanel({ isPublic, setIsPublic }: SharePanelProps) {
  return (
    <div className="w-52 rounded-xl border bg-card p-3 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Share
      </p>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Public URL</span>
        <button
          onClick={() => setIsPublic(!isPublic)}
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            isPublic ? "bg-primary" : "bg-muted-foreground/30",
          )}
          aria-label="Toggle public URL"
        >
          <span
            className={cn(
              "absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-transform",
              isPublic ? "translate-x-3.5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>
      {isPublic && (
        <Button variant="outline" size="sm" className="mt-1 w-full">
          Copy Link
        </Button>
      )}
    </div>
  )
}

// ─── types ────────────────────────────────────────────────────────────────────

type PanelId = "db" | "sync" | "schema" | "context" | "share"

const TOOLBAR_BUTTONS: { id: PanelId; label: string }[] = [
  { id: "db", label: "DB Connection" },
  { id: "sync", label: "Sync" },
  { id: "schema", label: "Schema" },
  { id: "context", label: "Context" },
  { id: "share", label: "Share" },
]

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CanvasPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [activePanel, setActivePanel] = useState<PanelId | null>(null)
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(["users"]))
  const [lastSynced] = useState<Date>(new Date(Date.now() - 2 * 60 * 1000))
  const [isPublic, setIsPublic] = useState(false)
  const [syncSchedule, setSyncSchedule] = useState("manual")

  const togglePanel = useCallback((id: PanelId) => {
    setActivePanel((prev) => (prev === id ? null : id))
  }, [])

  const toggleTable = useCallback((name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#94a3b8", strokeWidth: 1.5 },
          },
          eds,
        ),
      )
    },
    [setEdges],
  )

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const src = connection.source
      const tgt = connection.target
      if (!src || !tgt || src === tgt) return false

      const srcNode = nodes.find((n) => n.id === src)
      const tgtNode = nodes.find((n) => n.id === tgt)
      if (!srcNode || !tgtNode) return false

      if (srcNode.type === "analyzer" && tgtNode.type === "sql") return false
      if (hasPath(edges, tgt, src)) return false

      return true
    },
    [nodes, edges],
  )

  const addNode = useCallback(
    (type: "text" | "sql" | "analyzer") => {
      const id = `node-${Date.now()}`
      const defaultData: Record<"text" | "sql" | "analyzer", Record<string, unknown>> = {
        text: { markdown: "" },
        sql: { question: "", sql: "", result: null, chartType: "table" },
        analyzer: { command: "/analyze", output: "" },
      }
      setNodes((nds) => [
        ...nds,
        {
          id,
          type,
          position: { x: 180 + Math.random() * 300, y: 80 + Math.random() * 250 },
          data: defaultData[type],
        },
      ])
    },
    [setNodes],
  )

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      {/* ── Full-screen canvas ── */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-40" />
        <Controls position="bottom-left" />
      </ReactFlow>

      {/* ── Floating toolbar — top-left ── */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        {/* Button row */}
        <div className="flex items-center gap-1">
          <div className="mr-1 flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HugeiconsIcon icon={CommandIcon} size={14} strokeWidth={2} />
          </div>

          {TOOLBAR_BUTTONS.map(({ id, label }) => (
            <Button
              key={id}
              variant={activePanel === id ? "secondary" : "outline"}
              size="sm"
              onClick={() => togglePanel(id)}
              className="shadow-sm"
            >
              {id === "share" && (
                <HugeiconsIcon icon={Share03Icon} size={11} strokeWidth={2} />
              )}
              {label}
            </Button>
          ))}
        </div>

        {/* Active panel — floats below the toolbar */}
        {activePanel === "db" && <DBPanel />}
        {activePanel === "sync" && (
          <SyncPanel
            lastSynced={lastSynced}
            syncSchedule={syncSchedule}
            setSyncSchedule={setSyncSchedule}
          />
        )}
        {activePanel === "schema" && (
          <SchemaPanel expandedTables={expandedTables} toggleTable={toggleTable} />
        )}
        {activePanel === "context" && <ContextPanel />}
        {activePanel === "share" && (
          <SharePanel isPublic={isPublic} setIsPublic={setIsPublic} />
        )}
      </div>

      {/* ── Add Node — bottom-center ── */}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 shadow-md">
              <HugeiconsIcon icon={UnfoldMoreIcon} size={12} strokeWidth={2} />
              Add Node
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className="w-40">
            <DropdownMenuItem onClick={() => addNode("text")}>
              <span className="mr-2 size-2 rounded-full bg-foreground/25" />
              Text Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addNode("sql")}>
              <span className="mr-2 size-2 rounded-full bg-blue-400" />
              SQL Query
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addNode("analyzer")}>
              <span className="mr-2 size-2 rounded-full bg-purple-400" />
              AI Analyzer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
