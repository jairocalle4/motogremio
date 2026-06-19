interface JsonViewerProps {
  data: Record<string, any> | null
  title?: string
}

export function JsonViewer({ data, title }: JsonViewerProps) {
  if (!data) {
    return (
      <div className="space-y-1">
        {title && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{title}</span>}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm text-slate-400 italic">
          Sin datos
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {title && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{title}</span>}
      <pre className="bg-slate-900 border border-slate-800 rounded p-3 text-xs font-mono text-slate-100 overflow-auto max-h-64 leading-relaxed scrollbar-thin">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
