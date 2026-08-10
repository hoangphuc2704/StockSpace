import React, { useEffect, useState } from 'react'
import Modal from '@/components/organisms/Modal'
import Button from '@/components/atoms/Button'
import { ChevronLeft, ChevronRight, Download, FileText, AlertCircle, Loader2 } from 'lucide-react'
import systemConfigApi from '@/services/systemConfigApi'

const ContractViewerModal = ({ isOpen, onClose, images = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [policy, setPolicy] = useState(null)
  const [loadingPolicy, setLoadingPolicy] = useState(false)

  // Ensure images is always an array
  const contractImages = Array.isArray(images) ? images : (images ? [images] : [])

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0)
      fetchPolicy()
    }
  }, [isOpen])

  const fetchPolicy = async () => {
    try {
      setLoadingPolicy(true)
      const data = await systemConfigApi.getActiveSystemPolicy()
      if (data) {
        setPolicy(data)
      }
    } catch (error) {
      console.error('Lỗi tải policy', error)
    } finally {
      setLoadingPolicy(false)
    }
  }

  const nextImage = () => {
    if (currentIndex < contractImages.length - 1) {
      setCurrentIndex(c => c + 1)
    }
  }

  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1)
    }
  }

  const downloadImage = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bản Phụ Lục Hợp Đồng"
      className="max-w-6xl w-[95vw]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side: Images (takes 2/3 space) */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-2 relative h-[500px] overflow-hidden group">
            {contractImages.length > 0 ? (
              <>
                <img
                  src={contractImages[currentIndex]}
                  alt={`Contract page ${currentIndex + 1}`}
                  className="max-h-full max-w-full object-contain cursor-zoom-in"
                  onClick={() => downloadImage(contractImages[currentIndex])}
                />
                
                {/* Navigation Buttons */}
                {contractImages.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      disabled={currentIndex === 0}
                      className="absolute left-4 p-2 rounded-full bg-white/80 text-slate-800 shadow-md hover:bg-white disabled:opacity-30 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button 
                      onClick={nextImage}
                      disabled={currentIndex === contractImages.length - 1}
                      className="absolute right-4 p-2 rounded-full bg-white/80 text-slate-800 shadow-md hover:bg-white disabled:opacity-30 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Counter */}
                {contractImages.length > 1 && (
                  <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                    {currentIndex + 1} / {contractImages.length}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <FileText className="h-12 w-12 mb-2 opacity-30" />
                <p>Không có ảnh hợp đồng</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-1">
            <p className="text-sm text-slate-500">
              Bạn có thể click vào ảnh để tải xuống hoặc xem kích thước đầy đủ.
            </p>
            {contractImages.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => downloadImage(contractImages[currentIndex])}>
                <Download className="h-4 w-4 mr-2" /> Tải ảnh này
              </Button>
            )}
          </div>
        </div>

        {/* Right side: System Policy */}
        <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[500px]">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800">Cam Kết Ràng Buộc</h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1 text-sm text-slate-600 prose prose-sm max-w-none">
            {loadingPolicy ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                <p className="text-slate-400">Đang tải chính sách...</p>
              </div>
            ) : policy ? (
              <div dangerouslySetInnerHTML={{ __html: policy.content.replace(/\n/g, '<br/>') }} />
            ) : (
              <p className="text-slate-400 italic text-center py-10">Không thể tải thông tin cam kết.</p>
            )}
          </div>
          {policy && (
            <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
              <span>Phiên bản: {policy.version}</span>
              <span>Ngày cập nhật: {new Date(policy.updatedAt || policy.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <Button onClick={onClose} variant="outline">Đóng</Button>
      </div>
    </Modal>
  )
}

export default ContractViewerModal
