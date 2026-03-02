import { useRef, useEffect } from 'react'
import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { TYBIS_DTS } from '@/lib/tybis-dts'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const monacoRef = useRef<typeof Monaco | null>(null)

  const handleMount: OnMount = (_editor, monaco) => {
    monacoRef.current = monaco

    // Inject tybis type declarations so users get autocomplete + type errors.
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      TYBIS_DTS,
      'ts:tybis-sandbox.d.ts'
    )

    // Relax some TS checks that don't apply to the sandbox environment.
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      noEmit: true,
      strict: true,
      // Don't require imports — globals are injected by the sandbox.
      module: monaco.languages.typescript.ModuleKind.None,
    })

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })
  }

  // Keep the extra lib fresh if TYBIS_DTS ever changes (HMR during dev).
  useEffect(() => {
    if (!monacoRef.current) return
    monacoRef.current.languages.typescript.typescriptDefaults.addExtraLib(
      TYBIS_DTS,
      'ts:tybis-sandbox.d.ts'
    )
  }, [])

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="typescript"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        renderLineHighlight: 'gutter',
        tabSize: 2,
        wordWrap: 'off',
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        suggest: {
          showKeywords: true,
          showSnippets: true,
        },
      }}
    />
  )
}
