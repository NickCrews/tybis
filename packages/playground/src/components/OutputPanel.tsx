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

  return (
    <Tabs defaultValue="prql" className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-4 pt-3">
        <TabsList className="h-8">
          <TabsTrigger value="prql" className="h-6 px-3 text-xs">
            PRQL
          </TabsTrigger>
          <TabsTrigger
            value="sql"
            className="h-6 px-3 text-xs"
            disabled={!result.sql && !result.sqlError}
          >
            SQL
          </TabsTrigger>
        </TabsList>
      </div>

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
    </Tabs>
  )
}
