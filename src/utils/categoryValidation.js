export const CATEGORY_DUPLICATE_MESSAGE =
  'Category name already exists. Please use a different name.'

export const normalizeCategoryName = (value) => String(value || '').trim().toLowerCase()

export const hasDuplicateCategoryName = (categories, value) => {
  const normalizedValue = normalizeCategoryName(value)
  if (!normalizedValue) return false

  return (Array.isArray(categories) ? categories : []).some(
    (category) => normalizeCategoryName(category?.name) === normalizedValue
  )
}
