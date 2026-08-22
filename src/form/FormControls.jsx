import { useId, useState } from 'react'

const controlClassName =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const getId = (id, fallback) => id || `${fallback}-${Math.random().toString(36).slice(2, 8)}`

export function Field({ label, hint, id, name, className = '', endAdornment, ...props }) {
  const generatedId = useId()
  const fieldId = getId(id, `${name || 'field'}-${generatedId}`)

  return (
    <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
      {label}
      <div className={endAdornment ? 'relative' : undefined}>
        <input id={fieldId} name={name} className={`${controlClassName} ${endAdornment ? 'pr-10' : ''} ${className}`} {...props} />
        {endAdornment}
      </div>
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}

export function SelectField({ label, options = [], placeholder = 'Select an option', id, name, className = '', ...props }) {
  const generatedId = useId()
  const fieldId = getId(id, `${name || 'select'}-${generatedId}`)

  return (
    <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
      {label}
      <select id={fieldId} name={name} className={`${controlClassName} ${className}`} {...props}>
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value
          const text = typeof option === 'string' ? option : option.label
          return (
            <option key={value} value={value}>
              {text}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export function TextAreaField({ label, hint, id, name, className = '', ...props }) {
  const generatedId = useId()
  const fieldId = getId(id, `${name || 'textarea'}-${generatedId}`)

  return (
    <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
      {label}
      <textarea id={fieldId} name={name} className={`${controlClassName} min-h-24 resize-y ${className}`} {...props} />
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}

export function FileField({ label, id, name, accept, multiple = false }) {
  const generatedId = useId()
  const fieldId = getId(id, `${name || 'file'}-${generatedId}`)

  return (
    <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
      {label}
      <input
        id={fieldId}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        className="mt-1 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700"
      />
    </label>
  )
}

export function CheckboxField({ label, name, ...props }) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500" {...props} />
      <span>{label}</span>
    </label>
  )
}

export function RadioGroup({ label, name, options = [] }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-4">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" name={name} value={option.value} defaultChecked={option.defaultChecked} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function FormShell({ children, className = '', ...props }) {
  return (
    <form className={className} {...props}>
      {children}
    </form>
  )
}

export function FormCard({
  title,
  source,
  description,
  children,
  submitLabel = 'Save',
  className = '',
  embedded = false,
  onSubmit: submitHandler,
  isLoading = false,
  showStatus = true,
  extraContent,
  afterActions,
  submitControl,
}) {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    if (submitHandler) {
      submitHandler(event)
      return
    }

    event.preventDefault()
    setSubmitted(true)
  }

  const actionControl = submitControl || (
    <button type="submit" disabled={isLoading} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
      {isLoading ? 'Processing...' : submitLabel}
    </button>
  )

  const formContent = (
    <>
      {children}
      {extraContent}
      <div className={embedded ? 'pt-0' : 'flex items-center justify-between gap-3 border-t border-slate-100 pt-4'}>
        {showStatus && !embedded && (
          <span className="text-xs text-emerald-600" aria-live="polite">
            {submitted ? 'Preview submitted locally.' : 'Preview only — no API request.'}
          </span>
        )}
        {actionControl}
      </div>
      {afterActions}
    </>
  )

  if (embedded) {
    return (
      <FormShell className={`space-y-4 ${className}`} onSubmit={handleSubmit}>
        {formContent}
      </FormShell>
    )
  }

  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {source && <code className="text-xs text-slate-500">{source}</code>}
        </div>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>

      <FormShell
        className="space-y-4 p-5"
        onSubmit={handleSubmit}
      >
        {formContent}
      </FormShell>
    </section>
  )
}
