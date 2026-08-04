import api from './apiConfig'

const uploadApi = {
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  
  uploadImages: (files) => {
    const formData = new FormData()
    Array.from(files).forEach((file) => {
      formData.append('files', file)
    })
    
    return api.post('/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }
}

export default uploadApi
