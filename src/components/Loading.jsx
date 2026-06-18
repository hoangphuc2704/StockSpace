import { motion } from 'framer-motion'
import logoDaidien from '../assets/logoDaidien.png' // Đảm bảo đúng đường dẫn tới ảnh logo của bạn

const Loading = ({ fullScreen = true }) => {
  // Hoạt ảnh xoay tròn cho viền bên ngoài
  const spinVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  }

  // Hoạt ảnh co giãn nhịp nhàng cho Logo ở giữa
  const logoVariants = {
    animate: {
      scale: [1, 1.08, 1],
      opacity: [0.9, 1, 0.9],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  const loaderContent = (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Khung chứa vòng xoay và Logo */}
      <div className="relative flex items-center justify-center">
        {/* 1. Viền tròn xoay */}
        <motion.div
          variants={spinVariants}
          animate="animate"
          className="h-16 w-16 rounded-full border-2 border-slate-100 border-t-[#FF5A1F] border-r-[#FF5A1F]/30"
        />

        {/* 2. Khung tròn chứa Logo */}
        <motion.div
          variants={logoVariants}
          animate="animate"
          className="absolute flex h-11 w-11 items-center justify-center rounded-full border border-slate-50 bg-white shadow-sm"
        >
          <img src={logoDaidien} alt="StockSpace Logo" className="h-6 w-6 object-contain" />
        </motion.div>
      </div>

      {/* 3. Chữ "Waiting" hiệu ứng phập phồng nhẹ nhịp nhàng ở dưới */}
      <span className="animate-pulse text-[11px] font-semibold tracking-wider text-slate-400">
        Waiting...
      </span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-md">
        {loaderContent}
      </div>
    )
  }

  // Nếu dùng cục bộ bên trong một thẻ div nhỏ
  return <div className="flex h-full w-full items-center justify-center p-8">{loaderContent}</div>
}

export default Loading
