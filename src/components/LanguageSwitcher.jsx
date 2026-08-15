import { Globe2 } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage()

  return (
    <div
      data-i18n-skip="true"
      className="fixed top-2 right-3 z-[110] flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur"
      aria-label={language === 'vi' ? 'Chọn ngôn ngữ' : 'Choose language'}
    >
      <Globe2 className="ml-1 hidden h-4 w-4 text-slate-500 sm:block" aria-hidden="true" />
      {['en', 'vi'].map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
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
  )
}

export default LanguageSwitcher
