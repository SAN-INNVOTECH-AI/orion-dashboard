interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-orion-muted text-sm font-medium">{label}</label>}
      <input
        className={`bg-orion-card border border-orion-border rounded-lg px-3 py-2 text-orion-text w-full focus:outline-none focus:border-orion-accent transition-colors placeholder:text-orion-muted/50 ${className || ''}`}
        {...props}
      />
      {error && <span className="text-orion-danger text-xs">{error}</span>}
    </div>
  )
}
