import { Facebook, Instagram, Mail, Phone, Youtube } from 'lucide-react'
import { useSelector } from 'react-redux'

const PublicFooter = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  return (
    <footer className="bg-[#121212] pt-16 pb-12 text-left text-stone-400">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-stone-800 pb-16 sm:grid-cols-2 lg:grid-cols-12">
          <div id="about" className="scroll-mt-24 space-y-6 lg:col-span-4">
            <div className="flex items-center gap-2 text-white">
              <span className="text-xl font-black tracking-wider uppercase">
                <span className="text-white">Stock</span>{' '}
                <span className="text-[#FF5A1F]">Space</span>
              </span>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-stone-500">
              Storage infrastructure solution that integrates a smart digital system, completely
              solving storage and inventory control after signing a lease contract.
            </p>
            <div className="flex gap-3 pt-2">
              {[Facebook, Youtube, Instagram].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  aria-label="StockSpace social channel"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white transition-colors hover:bg-[#FF5A1F]"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">Menu</h4>
            <ul className="space-y-2.5 text-xs">
              {['Home page', 'About us', 'Warehouse service', 'Price list'].map((link) => (
                <li key={link}>
                  <a href="#" className="transition-colors hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">Support</h4>
            <ul className="space-y-2.5 text-xs">
              {[
                'Terms of use',
                'Privacy policy',
                '24/7 help',
                'API Documentation',
                'Operating procedures',
              ].map((link) => (
                <li key={link}>
                  <a href="#" className="transition-colors hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div id="contact" className="scroll-mt-24 space-y-4 lg:col-span-4">
            <h4 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">Contact</h4>
            <div className="flex items-center gap-4 border border-stone-800 bg-[#1a1a1a] p-4 transition-all hover:border-stone-700">
              <div className="text-[#FF5A1F]">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-500 uppercase">Care hotline</p>
                {isAuthenticated ? (
                  <a href="tel:123456789" className="text-xs font-bold text-white hover:underline">
                    123456789
                  </a>
                ) : (
                  <p className="text-xs font-semibold text-stone-300">
                    Sign in to view phone number
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 border border-stone-800 bg-[#1a1a1a] p-4 transition-all hover:border-stone-700">
              <div className="text-[#FF5A1F]">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-500 uppercase">Email box</p>
                <p className="text-xs font-bold text-white">cuongbui10704@gmail.com</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between pt-8 text-[11px] text-stone-600 sm:flex-row">
          <p>© {new Date().getFullYear()} StockSpace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
