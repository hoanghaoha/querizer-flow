# Product Design — Final
**"Think with your data. Not just query it."**

---

## 1. Vision

Most founders and small teams have a Postgres database and no data team. When they need to understand why revenue dropped, they either write SQL at 11pm or wait a week for an answer. We built a thinking canvas — connect your DB, map your question as a graph, let AI fill in the data and synthesize the findings. Hit Sync every Monday and your entire analysis updates in seconds.

It is not a dashboard. It is not a chatbot. It is how fast-moving teams make decisions when they cannot afford to wait.

---

## 2. ICP

```
Who:        Startup founder / SME owner / solo analyst
DB:         Postgres (production DB = analytics DB)
Team:       0–2 data people, or none
Tool now:   TablePlus, psql, copy-paste into Google Sheets
Pain:       Questions pile up, no one to answer them fast
Budget:     Pays immediately if it works, no procurement cycle
```

---

## 3. Positioning

| Competitor | Their angle | Why we win |
|---|---|---|
| Julius / BlazeSQL | Chat-first | Chat is ephemeral. Canvas is persistent. |
| Observable Canvases | Engineers, manual SQL | We are for everyone. AI writes the SQL. |
| BigQuery Canvas | GCP only, enterprise | We work on any Postgres, SMB pricing. |
| Metabase / Tableau | Dashboard output | We produce reasoning, not dashboards. |
| ChatGPT | General purpose | We know your DB. ChatGPT forgets everything. |

**Tagline:** "Think with your data. Not just query it."

**vs competitors:**
- vs Observable: "Observable is for engineers who write SQL. We are for anyone with a question."
- vs Julius: "Julius answers questions. We help you think through them."
- vs Metabase: "Metabase shows you data. We help you figure out what it means."
- vs ChatGPT: "ChatGPT forgets everything. We remember how your business works."

---

## 4. Core Features — V1

### 4.1 DB Connect
- Input: Postgres connection string
- Schema ingestion runs automatically on connect (no AI, free):
  - All tables + columns + types + nullable flags
  - Foreign key relationships
  - Row counts per table
  - Sample 5 rows per table
  - Normalize all column types → `NUMBER | TEXT` only
- Embed all tables → pgvector (one vector per table)
- Land user directly on Canvas after ingestion

### 4.2 RAG Import (optional)
- Upload: PDF, MD, TXT, CSV
- Chunking strategy per file type:
  - MD: chunk by heading sections (~400 tokens each)
  - PDF/TXT: chunk by paragraph, 50-token overlap (~300 tokens)
  - CSV ≤50 rows: embed entire table as one chunk
  - CSV >50 rows: embed row by row (~50 tokens each)
- Prepend source filename to every chunk text for attribution
- Embed all chunks → same pgvector embeddings table as schema
- Acts as implicit annotation — business definitions live here
- User-triggered upload, not automatic

### 4.3 Canvas (React Flow)
Three-panel layout:

```
┌──────────────┬────────────────────────┬──────────────┐
│ Left Sidebar │       Canvas           │ Right Panel  │
│ (200px)      │  (React Flow, center)  │ (188px)      │
│              │                        │              │
│ Schema       │  [nodes + edges]       │ Sync         │
│ Browser      │                        │ Share        │
│              │  [+ Add Node]          │ RAG docs     │
│ Tables list  │                        │              │
└──────────────┴────────────────────────┴──────────────┘
```

**Top bar:** Logo · Canvas tabs · DB status pill · Share · Sync button

**Left sidebar:** Schema browser — tables → columns → types → row counts → FK indicators. Collapsible.

**Right panel:** Sync controls (schedule + manual) · Share link · RAG doc list

### 4.4 Node Types

#### Text Node
- Pure markdown input
- User writes: hypothesis, context, business rules, notes
- Primary business context source — replaces explicit annotation
- Connect to SQL Nodes to provide query context
- Color: neutral/white

#### SQL Node
- User describes what they want in plain English, OR writes SQL directly
- AI generates SQL using context pipeline (see section 6)
- Three views toggled in toolbar:
  - **Table** — default, always rendered first, always correct
  - **Chart** — user-triggered, optional
  - **SQL** — editable, shows generated query, user can correct
- Chart toolbar: `[Bar] [Line] [Pie] [Stacked] [Metric]`
  - Enabled/disabled by column shape algorithm
  - Table always enabled and always default
- Color: blue

#### AI Analyzer Node
- Reads all connected incoming nodes (Text + SQL + other Analyzers)
- Slash commands:
  - `/analyze` — cross-references all connected data, writes synthesis
  - `/summarize` — one paragraph executive summary
  - `/insight` — flags the most interesting pattern
- Output: streaming markdown text
- Can connect to another AI Analyzer (chain reasoning)
- Color: purple

### 4.5 Node Connection Rules

```
Text Node    → SQL Node          ✓  context for query
Text Node    → AI Analyzer       ✓  hypothesis input
SQL Node     → SQL Node          ✓  chain queries
SQL Node     → AI Analyzer       ✓  analyze this result
AI Analyzer  → AI Analyzer       ✓  chain reasoning
AI Analyzer  → SQL Node          ✗  not in v1
Circular     → any               ✗  blocked always
```

Edges show data flow direction with arrows. Invalid connections rejected with tooltip explanation.

### 4.6 Chart Type Algorithm

Two internal column types only: `NUMBER | TEXT`

```typescript
// Type normalizer — per DB dialect
// Postgres:  NUMBER = OIDs [20, 21, 23, 700, 701, 1700]
// MySQL:     NUMBER = ['INT','BIGINT','FLOAT','DOUBLE','DECIMAL','NUMERIC']
// SQLite:    NUMBER = type string contains ['INT','REAL','FLOAT','DOUBLE','NUMERIC']
// Everything else → TEXT

// Chart availability per result shape
const text  = columns.find(c => c.type === 'TEXT')
const text2 = columns.filter(c => c.type === 'TEXT')[1]
const num   = columns.find(c => c.type === 'NUMBER')

TABLE:         always enabled, always default
METRIC:        num exists
BAR:           text + num   →  x=text, y=num
LINE:          text + num   →  x=text, y=num  (same mapping, different visual)
PIE:           text + num   →  label=text, value=num
               disabled if unique text values > 12
STACKED BAR:   text + text2 + num  →  x=text, stack=text2, y=num
```

- AI always writes `ORDER BY` in generated SQL — ordering is SQL's job, not the chart's
- No DATE type needed — ISO date strings sort correctly as TEXT when ordered by SQL
- Chart selection saved per node, persists across Sync
- User corrects ordering by editing SQL, not chart config

### 4.7 Sync

The core product mechanic — entire analysis graph updates at once.

```
User clicks [Sync]
      ↓
Traverse all nodes → build DAG (topological sort)
      ↓
Re-run all SQL Nodes in parallel (no upstream dependencies)
      ↓
Each SQL Node completes → triggers connected AI Analyzer Nodes
      ↓
AI Analyzer reads fresh data from all connected upstream nodes
      ↓
Chain: AI Analyzer → AI Analyzer runs sequentially (upstream first)
      ↓
All nodes show "Updated X seconds ago"
Canvas header shows last sync timestamp
```

Scheduled sync: Daily / Weekly / Monthly (Inngest jobs)
Manual sync: one-click, always available in top bar

### 4.8 Share

- Public read-only URL: `yourdomain.io/s/canvas-slug`
- Canvas renders in view mode — no edit controls shown
- Data is live — viewer sees current query results
- Optional password protection
- No login required for viewers
- Stakeholders see reasoning map + findings, not raw queries

---

## 5. What Is Explicitly Out of V1

| Feature | Reason deferred |
|---|---|
| Schema annotation UI | RAG + Text Blocks solve this, no extra UI needed |
| Auto-annotation agent | Unnecessary — RAG handles implicitly |
| MySQL support | Trivial to add after Postgres solid — v1.5 |
| Snowflake / BigQuery | Different auth model, async queries — v2 |
| Multi-DB per canvas | Complexity — one DB per canvas in v1 |
| Real-time collaboration | Needs CRDTs, Liveblocks — post-PMF |
| Version history | Nice, not core to value prop |
| Mobile creation UX | Consumption yes, creation no |
| Scheduled alerts | Post-v1 |
| Embedded analytics SDK | Enterprise feature |
| AI Analyzer → SQL edge | Validate need before building |
| Dashboard export | Post-v1 |

---

## 6. AI Architecture

### Context Pipeline (per SQL Node execution)

```python
async def build_query_context(
    user_question: str,
    connected_text_blocks: list[str],   # user's hypothesis nodes
    connection_id: str
) -> str:

    # Embed question + user's own words together
    query_text = user_question + " " + " ".join(connected_text_blocks)
    embedding  = await embed(query_text)

    # Three parallel vector retrievals from same table
    tables, rag_chunks, corrections = await asyncio.gather(
        retrieve(embedding, connection_id,
                 source_type='schema_table',    top_k=5),
        retrieve(embedding, connection_id,
                 source_type='rag_chunk',       top_k=3),
        retrieve(embedding, connection_id,
                 source_type='sql_correction',  top_k=3),
    )

    return build_prompt(
        text_blocks=connected_text_blocks,
        tables=tables,
        rag=rag_chunks,
        corrections=corrections,
        question=user_question
    )
```

**Token budget per query:**
```
User's text blocks:        ~200 tokens
Relevant schema (5 tables): ~500 tokens
RAG chunks (3):            ~600 tokens
SQL corrections (3):       ~300 tokens
Question:                   ~50 tokens
────────────────────────────────────────
Total input:              ~1,650 tokens
Estimated output:          ~400 tokens
Cost per query:            ~$0.014
```

### Self-Learning (SQL Corrections)

When user edits AI-generated SQL in a node, store the correction:

```python
async def store_correction(connection_id, question, original_sql, corrected_sql):
    embedding = await embed(question)
    await db.insert('embeddings', {
        'connection_id': connection_id,
        'source_type':   'sql_correction',
        'text': f"Question: {question}\nWrong SQL: {original_sql}\nCorrect SQL: {corrected_sql}",
        'embedding':     embedding
    })
```

Retrieved as few-shot examples in future queries. AI learns DB-specific patterns (units, business logic, naming conventions) without explicit training.

### AI Analyzer Context

```python
async def build_analyzer_context(node_id: str) -> str:
    upstream = get_connected_upstream(node_id)  # traverse edges
    parts = []

    for node in upstream:
        if node.type == 'text':
            parts.append(f"## Hypothesis\n{node.content}")
        elif node.type == 'sql':
            parts.append(
                f"## {node.title}\n"
                f"Query: {node.sql}\n"
                f"Result:\n{format_table_as_markdown(node.result)}"
            )
        elif node.type == 'analyzer':
            parts.append(f"## Prior Analysis\n{node.output}")

    return "\n\n".join(parts)
```

The canvas IS the context. Analyzer synthesizes across all connected nodes simultaneously — impossible in any chat-based tool.

---

## 7. Embedding Strategy

### Schema Tables — One vector per table

```python
def build_table_embedding_text(table, columns, samples, fks):
    col_lines = []
    for col in columns:
        sample_str = ", ".join(str(s) for s in samples.get(col.name, []))
        fk_str     = f" → {fks[col.name]}" if col.name in fks else ""
        col_lines.append(
            f"  {col.name} ({col.col_type}){fk_str}"
            + (f"  e.g. {sample_str}" if sample_str else "")
        )
    return f"Table: {table.name} ({table.row_count:,} rows)\n" + "\n".join(col_lines)
```

24 tables = 24 vectors. Tiny index, fast retrieval.

### RAG Documents — Chunk by type

```
MD:       chunk by ## heading sections, ~400 tokens
PDF/TXT:  chunk by paragraph, 50-token overlap, ~300 tokens
CSV ≤50:  embed entire table as one chunk
CSV >50:  embed row by row, ~50 tokens each
All:      prepend "Source: filename.ext\n" to every chunk
```

### Unified Vector Store

```sql
CREATE TABLE embeddings (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id uuid REFERENCES connections ON DELETE CASCADE,
    source_type   text NOT NULL,   -- 'schema_table' | 'rag_chunk' | 'sql_correction'
    source_id     uuid,
    text          text NOT NULL,   -- injected into prompt verbatim
    embedding     vector(1536),
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX ON embeddings
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX ON embeddings (connection_id, source_type);
```

One table. Three source types. One retrieval query at inference time.

---

## 8. Data Model

```sql
-- User connections
CREATE TABLE connections (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES auth.users,
    name        text,
    db_type     text DEFAULT 'postgres',
    conn_string text,              -- encrypted at rest (Supabase Vault)
    created_at  timestamptz DEFAULT now()
);

-- Ingested schema (no AI, runs on connect)
CREATE TABLE schema_tables (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id uuid REFERENCES connections ON DELETE CASCADE,
    name          text,
    row_count     bigint,
    last_synced   timestamptz DEFAULT now()
);

CREATE TABLE schema_columns (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id      uuid REFERENCES schema_tables ON DELETE CASCADE,
    name          text,
    col_type      text,            -- 'NUMBER' | 'TEXT'
    is_nullable   boolean,
    sample_values jsonb,           -- array of up to 5 sample values
    fk_ref        text             -- "users.id" format if FK detected
);

-- RAG documents
CREATE TABLE rag_documents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id uuid REFERENCES connections ON DELETE CASCADE,
    filename      text,
    file_type     text,            -- 'pdf' | 'md' | 'txt' | 'csv'
    chunk_count   integer,
    uploaded_at   timestamptz DEFAULT now()
);

-- Unified embeddings (schema + RAG + corrections)
CREATE TABLE embeddings (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id uuid REFERENCES connections ON DELETE CASCADE,
    source_type   text NOT NULL,
    source_id     uuid,
    text          text NOT NULL,
    embedding     vector(1536),
    created_at    timestamptz DEFAULT now()
);

-- Canvases
CREATE TABLE canvases (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid REFERENCES auth.users,
    connection_id    uuid REFERENCES connections,
    title            text DEFAULT 'Untitled Canvas',
    slug             text UNIQUE,
    is_public        boolean DEFAULT false,
    password_hash    text,
    refresh_schedule text DEFAULT 'manual',  -- 'manual'|'daily'|'weekly'|'monthly'
    last_synced      timestamptz,
    created_at       timestamptz DEFAULT now()
);

-- Nodes
CREATE TABLE nodes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id  uuid REFERENCES canvases ON DELETE CASCADE,
    type       text NOT NULL,      -- 'text' | 'sql' | 'analyzer'
    position_x float,
    position_y float,
    width      float,
    height     float,
    content    jsonb,
    created_at timestamptz DEFAULT now()
);

-- content jsonb shape:
-- text:     { markdown: string }
-- sql:      { question: string, sql: string, result: json,
--             chart_type: string, last_run: timestamptz }
-- analyzer: { command: string, output: string, last_run: timestamptz }

-- Edges
CREATE TABLE edges (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id uuid REFERENCES canvases ON DELETE CASCADE,
    source_id uuid REFERENCES nodes ON DELETE CASCADE,
    target_id uuid REFERENCES nodes ON DELETE CASCADE,
    UNIQUE(source_id, target_id)
);
```

---

## 9. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind | Fast to ship, SSR for share pages |
| Canvas | React Flow | Node-based, DAG built-in, edges + layout |
| Charts | ECharts | Deterministic rendering, MIT, responsive |
| Backend | FastAPI (Python) | Async, schema ingestion, query execution |
| AI Agents | LangChain + LangGraph | RAG pipeline, parallel flows, stateful agents |
| LLM | Claude API (claude-sonnet-4-20250514) | SQL generation, AI analysis |
| Embeddings | text-embedding-3-small (OpenAI) | $0.02/1M tokens, 1536 dims, fast |
| Vector + App DB | Supabase (Postgres + pgvector + Auth) | One platform, no separate vector DB |
| Job Queue | Inngest | Scheduled sync, schema re-ingestion triggers |
| Cache | Upstash Redis | Query result cache, TTL 1 hour |
| Deploy | Vercel (frontend) + Railway (FastAPI) | Simple, fast, affordable |
| Monitoring | Sentry + PostHog | Errors + product analytics |

---

## 10. LangGraph Agent Design

### Setup Agent (runs on DB connect + RAG upload)

```
load_schema
    ↓
[parallel fan-out] embed_table  ×  N tables
    ↓
[merge]  save_embeddings
```

### Query Agent (runs on every SQL Node)

```
embed_question + text_blocks
    ↓
[parallel] retrieve_tables / retrieve_rag / retrieve_corrections
    ↓
build_prompt
    ↓
generate_sql  (Claude)
    ↓
validate_sql  (syntax + dangerous query check)
    ↓
execute_sql   (user's Postgres)
    ↓
return rows + column types → canvas node
```

### Analyzer Agent (runs on AI Analyzer Node)

```
collect_upstream_nodes  (traverse edges)
    ↓
build_analyzer_context
    ↓
generate_analysis  (Claude, streaming)
    ↓
stream output → node in real time
```

---

## 11. Pricing

| Tier | Price | Limits |
|---|---|---|
| Free | $0 | 1 DB, 3 canvases, 50 AI queries/mo, manual sync only |
| Pro | $19/mo | 3 DBs, unlimited canvases, unlimited queries, scheduled sync, public share |
| Overage | pay-as-you-go | $0.02 per extra query · $0.10 per extra sync run |

**Unit economics:**
- Cost per query: ~$0.014
- Pro plan covers ~1,350 queries at cost
- 1,000 Pro users × $19 = $19,000 MRR
- Claude API at 100 queries/user: $1,400/month
- Gross margin: ~93% before infrastructure

---

## 12. Build Order — 10 Weeks Solo

```
Week 1–2    Postgres connect + schema ingestion
            Column type normalizer (NUMBER | TEXT)
            Table embedding → pgvector
            LangGraph setup agent (parallel embed)

Week 3      React Flow canvas shell
            Text Node (markdown, editable)
            Left sidebar schema browser

Week 4–5    SQL Node
            LangGraph query agent
            Context pipeline: embed → retrieve → prompt → Claude
            Table result rendering (default view)

Week 6      Chart type algorithm
            ECharts integration (Bar, Line, Pie, Stacked, Metric)
            Chart toolbar + toggle

Week 7      AI Analyzer Node
            LangGraph analyzer agent
            Edge system + DAG connection rules

Week 8      Sync (topological sort + parallel DAG execution)
            Scheduled sync via Inngest
            Right panel UI

Week 9      RAG upload (PDF, MD, TXT, CSV)
            Chunking + embedding pipeline per file type
            SQL correction store + retrieval

Week 10     Share (public URL + password option)
            Onboarding flow (connect → canvas in < 2 min)
            Error states, loading skeletons, polish
```

---

## 13. Go-To-Market

**Where first users are:**
- Hacker News Show HN — "I built a thinking canvas for your Postgres DB"
- Supabase Discord + community — every user has a Postgres DB
- Indie Hackers — founders who need to understand their own data
- Reddit r/SaaS, r/startups
- Dev Twitter/X

**Launch hook — one ready-made template:**
"Weekly Business Review" — connect your Postgres DB, get a pre-built canvas with Revenue, Churn, Signups, and Growth nodes already wired. Hit Sync. Done in 5 minutes.

Shareable demo, obvious value prop, zero configuration required.

---

## 14. The One-Paragraph Pitch

*"Most founders have a Postgres database and zero data team. When they need to understand why revenue dropped, they either write SQL at 11pm or wait a week for an answer that might be wrong. We built a thinking canvas — connect your DB once, map your question as a graph of nodes, let AI fill in the data and synthesize the findings across all of them. Hit Sync on Monday and your entire analysis updates in seconds. It is not a dashboard. It is not a chatbot. It is how fast-moving teams make decisions when they cannot afford to wait."*

---

*v1.0 Final — May 2026*
