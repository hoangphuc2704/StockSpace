import { useState, useEffect } from 'react'
import { FormShell } from '@/form/FormControls'
import { Plus, Trash2, LayoutGrid, Loader2 } from 'lucide-react'
import TableActionMenu from '@/components/TableActionMenu'
import DataTable from '@/components/organisms/DataTable'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import productApi from '../../../services/wms/productApi'
import { toast } from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import { showApiErrorToast } from '@/config/apiError'
import { required } from '@/config/validation'

const CategoryPage = () => {
  const confirmDialog = useConfirmDialog()
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const res = await productApi.getCategories()
      setCategories(res.data?.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      showApiErrorToast(error, 'Could not load categories.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Fetch the server-backed category list when the screen mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories()
  }, [])

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    const validationError = required(newCategoryName, 'Category name')
    if (validationError) {
      toast.error(validationError)
      return
    }
    setIsCreatingCategory(true)
    try {
      await productApi.createCategory({ name: newCategoryName })
      toast.success('Category created.')
      setIsCategoryModalOpen(false)
      setNewCategoryName('')
      fetchCategories()
    } catch (error) {
      showApiErrorToast(error, 'Could not create category.')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    const confirmed = await confirmDialog({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category?',
      type: 'danger',
      confirmText: 'Delete',
    })
    if (!confirmed) return

    try {
      await productApi.deleteCategory(categoryId)
      toast.success('Category deleted.')
      fetchCategories()
    } catch (error) {
      showApiErrorToast(error, 'Could not delete category.')
    }
  }

  const filteredCategories = categories.filter(c => {
    if (searchQuery) {
      return c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto w-full max-w-400 space-y-8 p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                  <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
                    <LayoutGrid className="h-6 w-6" />
                  </div>
                  Category Management
                </h1>
                <p className="text-sm text-slate-500">
                  Organize and manage your product categories.
                </p>
              </div>
              <Button onClick={() => setIsCategoryModalOpen(true)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </div>

            {/* Top Search Area */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <InputField
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-blue-400 focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="flex justify-center gap-3 pt-2">
                  <Button className="bg-slate-500 hover:bg-slate-600 w-32">Search</Button>
                  <Button variant="outline" className="w-32 bg-slate-50 text-slate-600 border-slate-200" onClick={() => setSearchQuery('')}>
                    <div className="flex items-center gap-2 justify-center">
                      <Trash2 className="h-4 w-4" /> Clear
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Summary Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 pt-3">
                <button className="relative pb-3 text-sm font-semibold text-slate-700 transition-colors">
                  <div className="flex flex-col items-center gap-1">
                    <span>Categories</span>
                    <span className="bg-blue-100 text-blue-700 text-xs px-3 py-0.5 rounded-full">{filteredCategories.length}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 h-0.5 w-full bg-slate-400" />
                </button>
              </div>

              {/* Table Controls */}
              <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <button className="flex items-center justify-center p-1 border border-slate-300 rounded bg-white hover:bg-slate-50">
                  ⚙️ ▾
                </button>
                <span>Selected (0) | Showing (1 - {filteredCategories.length}) | Found ({filteredCategories.length}) | Total ({categories.length})</span>
                <div className="flex-1" />
                <button className="border border-slate-300 bg-white px-3 py-1 rounded hover:bg-slate-50">
                  All Columns
                </button>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded border-slate-300" /></th>
                        <th className="px-4 py-3 border-r border-slate-200 w-full">Category Name</th>
                        <th className="px-4 py-3 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCategories.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                            Không tìm thấy Category nào.
                          </td>
                        </tr>
                      ) : filteredCategories.map(c => {
                        const canManage = Boolean(c.tenantId)
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-center border-r border-slate-100"><input type="checkbox" className="rounded border-slate-300" /></td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-700 font-medium">
                              {c.name}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {canManage ? (
                                <button onClick={() => handleDeleteCategory(c.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                                  <Trash2 className="h-4 w-4 mx-auto" />
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs italic">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <Modal
              isOpen={isCategoryModalOpen}
              onClose={() => setIsCategoryModalOpen(false)}
              title="Add New Category"
            >
              <FormShell onSubmit={handleCreateCategory} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Category name *</label>
                  <InputField
                    placeholder="e.g. Household appliances"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                  />
                </div>
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCategoryModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isCreatingCategory}>
                    Save Category
                  </Button>
                </div>
              </FormShell>
            </Modal>
          </main>
        </div>
      </div>
    </div>
  )
}

export default CategoryPage
