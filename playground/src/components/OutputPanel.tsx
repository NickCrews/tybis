import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { AlertCircle, Code2 } from 'lucide-react'
import type { PreviewResult } from '@/lib/runner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface OutputPanelProps {
  result: PreviewResult | null
  isRunning: boolean
}

const codeStyle: React.CSSProperties = {
  background: 'transparent',
  padding: '0',
  margin: '0',
  fontSize: '13px',
  lineHeight: '1.6',
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
}

function RecordsTable({ rows }: { rows: Record<string, any>[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground italic p-4">No rows returned.</p>
  }
  const columns = Object.keys(rows[0]!)
  return (
    <div className="overflow-auto p-2">
      <table className="w-full border-collapse text-xs font-mono">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th key={col} className="text-left px-2 py-1.5 font-semibold text-accent whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn('border-b border-border/50', i % 2 === 0 && 'bg-muted/20')}>
              {columns.map(col => (
                <td key={col} className="px-2 py-1 whitespace-nowrap">
                  {row[col] === null ? <span className="text-muted-foreground italic">null</span>
                    : row[col] === undefined ? <span className="text-muted-foreground italic">undefined</span>
                    : typeof row[col] === 'boolean' ? String(row[col])
                    : typeof row[col] === 'number' ? (Number.isInteger(row[col]) ? String(row[col]) : row[col].toFixed(2))
                    : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function OutputPanel({ result, isRunning }: OutputPanelProps) {
  if (isRunning) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <span className="animate-pulse">Running…</span>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Code2 className="h-10 w-10 opacity-30" />
        <p className="text-sm">
          Call <code className="font-mono text-accent">preview(relation)</code> in your
          code, then press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">⌘ Enter</kbd> to run.
        </p>
      </div>
    )
  }

  if (result.kind === 'error') {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Error</span>
        </div>
        <pre className="flex-1 overflow-auto rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {result.message}
        </pre>
      </div>
    )
  }

  const hasPrql = result.prql.length > 0
  const hasSql = !!result.sql || !!result.sqlError
  const hasRecords = !!result.records
  const defaultTab = hasRecords ? 'records' : 'prql'

  return (
    <Tabs defaultValue={defaultTab} className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-4 pt-3">
        <TabsList className="h-8">
          {hasPrql && (
            <TabsTrigger value="prql" className="h-6 px-3 text-xs">
              PRQL
            </TabsTrigger>
          )}
          {hasSql && (
            <TabsTrigger
              value="sql"
              className="h-6 px-3 text-xs"
              disabled={!result.sql && !result.sqlError}
            >
              SQL
            </TabsTrigger>
          )}
          {hasRecords && (
            <TabsTrigger value="records" className="h-6 px-3 text-xs">
              Results ({result.records!.length} rows)
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      {hasPrql && (
        <TabsContent value="prql" className="flex-1 overflow-auto p-4 mt-0">
          <SyntaxHighlighter
            language="sql"
            style={atomOneDark}
            customStyle={codeStyle}
            PreTag={({ children }) => (
              <pre className="whitespace-pre">{children}</pre>
            )}
          >
            {result.prql}
          </SyntaxHighlighter>
        </TabsContent>
      )}

      {hasSql && (
        <TabsContent value="sql" className="flex-1 overflow-auto p-4 mt-0">
          {result.sqlError ? (
            <div className={cn('flex flex-col gap-2')}>
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                SQL compilation failed
              </div>
              <pre className="text-sm text-destructive/80 whitespace-pre-wrap">
                {result.sqlError}
              </pre>
            </div>
          ) : (
            <SyntaxHighlighter
              language="sql"
              style={atomOneDark}
              customStyle={codeStyle}
              PreTag={({ children }) => (
                <pre className="whitespace-pre">{children}</pre>
              )}
            >
              {result.sql ?? ''}
            </SyntaxHighlighter>
          )}
        </TabsContent>
      )}

      {hasRecords && (
        <TabsContent value="records" className="flex-1 overflow-auto mt-0">
          <RecordsTable rows={result.records!} />
        </TabsContent>
      )}
    </Tabs>
  )
}
