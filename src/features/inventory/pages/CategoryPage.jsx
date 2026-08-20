import { useState, useEffect } from 'react'
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

  const columns = [
    {
      header: 'Category Name',
      render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          label={`Actions for ${row.name}`}
          items={
            row.tenantId
              ? [
                  {
                    label: 'Delete',
                    icon: Trash2,
                    danger: true,
                    onClick: () => handleDeleteCategory(row.id),
                  },
                ]
              : []
          }
        />
      ),
    },
  ]

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

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <DataTable columns={columns} data={categories} />
              )}
            </div>

            <Modal
              isOpen={isCategoryModalOpen}
              onClose={() => setIsCategoryModalOpen(false)}
              title="Add New Category"
            >
              <form onSubmit={handleCreateCategory} className="space-y-4">
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
              </form>
            </Modal>
          </main>
        </div>
      </div>
    </div>
  )
}

export default CategoryPage
