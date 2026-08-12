import { ExternalLink, Languages } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'

const vietnameseWords = new Set([
  'các',
  'cho',
  'của',
  'được',
  'không',
  'kho',
  'là',
  'một',
  'người',
  'những',
  'này',
  'phù',
  'quản',
  'sử',
  'tại',
  'theo',
  'thuê',
  'trong',
  'và',
  'với',
])

const detectTextLanguage = (text = '') => {
  if (/[ăâđêôơưĂÂĐÊÔƠƯ]|[àáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i.test(text)) return 'vi'
  const words = text.toLowerCase().match(/[a-z]+/g) || []
  const vietnameseWordCount = words.filter((word) => vietnameseWords.has(word)).length
  return vietnameseWordCount >= Math.max(2, Math.ceil(words.length * 0.18)) ? 'vi' : 'en'
}

const TranslatableText = ({ text, className = '', as: Component = 'p', fallback = '' }) => {
  const { language, t } = useLanguage()
  const hasUserText = Boolean(text)
  const value = hasUserText ? text : t(fallback)
  const sourceLanguage = detectTextLanguage(value)
  const needsTranslation = hasUserText && sourceLanguage !== language
  const translateUrl = needsTranslation
    ? `https://translate.google.com/?sl=${sourceLanguage}&tl=${language}&text=${encodeURIComponent(value)}&op=translate`
    : null

  return (
    <div data-i18n-skip="true">
      <Component className={className}>{value}</Component>
      {needsTranslation && (
        <a
          href={translateUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF5A1F] hover:underline"
        >
          <Languages className="h-3.5 w-3.5" aria-hidden="true" />
          {language === 'vi' ? 'Dịch sang tiếng Việt' : 'View English translation'}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

export default TranslatableText
