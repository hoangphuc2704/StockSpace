import { useState } from 'react'
import { Globe2 } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import useEscapeKey from '@/hooks/useEscapeKey'

const LanguageSwitcher = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  useEscapeKey(isOpen, () => setIsOpen(false))

  return (
    <div
      data-i18n-skip="true"
      className={`relative z-[110] flex shrink-0 items-center ${className}`}
      aria-label="Choose language"
    >
      {isOpen && (
        <div className="absolute top-14 right-0 flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
          {['en', 'vi'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setLanguage(option)
                setIsOpen(false)
              }}
              aria-pressed={language === option}
              className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors ${
                language === option
                  ? 'bg-[#FF5A1F] text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Choose language"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-lg backdrop-blur transition hover:border-orange-300 hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:outline-none"
      >
        <Globe2 className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}

export default LanguageSwitcher
