import api from './apiConfig'

const listingApi = {
  getPublicPackages: () => api.get('/listing-packages'),

  getPublicPackageById: (packageId) => api.get(`/listing-packages/${packageId}`),

  getOwnerPublicationHistory: (warehouseId) =>
    api.get(`/owner/warehouses/${warehouseId}/publications`),

  purchasePublication: (warehouseId, listingPackageId) =>
    api.post(`/owner/warehouses/${warehouseId}/publications`, { listingPackageId }),

  getAdminPackages: () => api.get('/admin/listing-packages'),

  getAdminPackageById: (packageId) => api.get(`/admin/listing-packages/${packageId}`),

  createAdminPackage: (data) => api.post('/admin/listing-packages', data),

  updateAdminPackage: (packageId, data) => api.put(`/admin/listing-packages/${packageId}`, data),

  deleteAdminPackage: (packageId) => api.delete(`/admin/listing-packages/${packageId}`),

  activateAdminPackage: (packageId) => api.patch(`/admin/listing-packages/${packageId}/activate`),

  deactivateAdminPackage: (packageId) =>
    api.patch(`/admin/listing-packages/${packageId}/deactivate`),
}

export default listingApi
