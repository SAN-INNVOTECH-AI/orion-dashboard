interface Option {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  error?: string
}

export default function Select({ label, value, onChange, options, placeholder, error }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-orion-muted text-sm font-medium">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-orion-card border border-orion-border rounded-lg px-3 py-2 text-orion-text w-full focus:outline-none focus:border-orion-accent transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-orion-card">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-orion-danger text-xs">{error}</span>}
    </div>
  )
}
