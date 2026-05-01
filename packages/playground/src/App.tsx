import { useState, useCallback, useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { CodeEditor } from '@/components/CodeEditor'
import { OutputPanel } from '@/components/OutputPanel'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { examples, defaultExample } from '@/examples'
import { runCode, type PreviewResult } from '@/lib/runner'

export default function App() {
  const [selectedExampleId, setSelectedExampleId] = useState(defaultExample.id)
  const [code, setCode] = useState(defaultExample.code)
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const latestRunIdRef = useRef(0)
  const activeRunsRef = useRef(0)

  const handleExampleChange = useCallback(
    (id: string) => {
      const example = examples.find((e) => e.id === id)
      if (example) {
        setSelectedExampleId(id)
        setCode(example.code)
        setResult(null)
      }
    },
    []
  )

  const handleRun = useCallback(async (codeToRun: string = code) => {
    const runId = ++latestRunIdRef.current
    activeRunsRef.current += 1
    setIsRunning(true)
    setResult(null)
    try {
      const r = await runCode(codeToRun)
      if (runId === latestRunIdRef.current) {
        setResult(r)
      }
    } finally {
      activeRunsRef.current -= 1
      if (activeRunsRef.current === 0) {
        setIsRunning(false)
      }
    }
  }, [code])

  const handleReset = useCallback(() => {
    const example = examples.find((e) => e.id === selectedExampleId)
    if (example) {
      setCode(example.code)
      setResult(null)
    }
  }, [selectedExampleId])

  // Run on Cmd+Enter / Ctrl+Enter
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleRun])

  useEffect(() => {
    void handleRun(code)
  }, [code, handleRun])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          {/* Logo / name */}
          <span className="font-bold tracking-tight">
            <span className="text-accent">ty</span>bis
          </span>
          <span className="text-xs text-muted-foreground">playground</span>
        </div>

        <div className="mx-2 h-5 w-px bg-border" />

        {/* Example selector */}
        <Select value={selectedExampleId} onValueChange={handleExampleChange}>
          <SelectTrigger className="h-8 w-64 text-xs">
            <SelectValue placeholder="Choose an example…" />
          </SelectTrigger>
          <SelectContent>
            {examples.map((ex) => (
              <SelectItem key={ex.id} value={ex.id} className="text-xs">
                {ex.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Reset to example code"
          onClick={handleReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />
      </header>

      {/* ── Main split pane ── */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className="flex h-full flex-1 flex-col overflow-hidden border-r border-border">
          <div className="shrink-0 flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">TypeScript</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor value={code} onChange={setCode} />
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex h-full w-[46%] shrink-0 flex-col overflow-hidden">
          <div className="shrink-0 flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">Output</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <OutputPanel result={result} isRunning={isRunning} />
          </div>
        </div>
      </main>
    </div>
  )
}
