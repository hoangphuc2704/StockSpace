import { Field, FormCard, SelectField, TextAreaField } from './FormControls'

// Form name: Create inventory category
export function CategoryForm() {
  return (
    <FormCard title="Create inventory category" source="features/inventory/pages/CategoryPage.jsx" submitLabel="Create Category">
      <Field label="Category name" name="name" placeholder="e.g. Household appliances" required />
    </FormCard>
  )
}

// Form name: Create SKU
export function SkuForm() {
  return (
    <FormCard title="Create SKU" source="features/inventory/pages/SkuPage.jsx" submitLabel="Save SKU">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product Name" name="productName" placeholder="Product Name" required />
        <Field label="SKU Code" name="skuCode" placeholder="SKU-000" required />
        <SelectField label="Category" name="category" options={['Electronics', 'Food', 'Household appliances']} placeholder="Select category" required />
        <SelectField label="Unit of Measure" name="uom" options={['Piece', 'Box', 'Kilogram', 'Pallet']} placeholder="Select unit" required />
        <Field label="Unit weight (kg)" name="unitWeight" type="number" min="0" step="0.000001" placeholder="0" required />
        <Field label="Unit volume (m³)" name="unitVolume" type="number" min="0" step="0.000001" placeholder="0" required />
      </div>
      <TextAreaField label="Specifications" name="specifications" placeholder="Color, size, material..." />
    </FormCard>
  )
}

// Form name: Create inventory audit
export function InventoryAuditForm() {
  return (
    <FormCard title="Create inventory audit" source="features/inventory/pages/InventoryAuditPage.jsx" submitLabel="Create Audit">
      <SelectField label="Warehouse" name="warehouse" options={['Main warehouse', 'Distribution hub']} placeholder="Select warehouse" required />
      <TextAreaField label="Note" name="note" placeholder="Add a note or audit reason..." />
    </FormCard>
  )
}

// Form name: Reject inventory audit
export function InventoryAuditRejectForm() {
  return (
    <FormCard title="Reject inventory audit" source="features/inventory/pages/InventoryAuditDetailPage.jsx" submitLabel="Reject Audit">
      <TextAreaField label="Rejection reason" name="reason" placeholder="Enter a rejection reason..." required />
    </FormCard>
  )
}

// Form name: Add product category
export function TenantCategoryForm() {
  return (
    <FormCard title="Add product category" source="features/tenant/pages/ProductManagementPage.jsx" submitLabel="Create">
      <Field label="Category name" name="categoryName" placeholder="Category name" required />
      <TextAreaField label="Default attributes (JSON)" name="categoryAttributes" rows={5} placeholder='{"color":"red"}' />
    </FormCard>
  )
}

// Form name: Add or edit tenant SKU
export function TenantSkuForm() {
  return (
    <FormCard title="Add or edit tenant SKU" source="features/tenant/pages/ProductManagementPage.jsx" submitLabel="Save SKU">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SKU code" name="skuCode" required />
        <Field label="Product name" name="name" required />
        <SelectField label="Category" name="categoryId" options={['Electronics', 'Food', 'Household appliances']} placeholder="No category" />
        <SelectField label="Unit of measure" name="uomId" options={['Piece', 'Box', 'Kilogram', 'Pallet']} placeholder="Select unit" required />
        <Field label="Unit weight (kg)" name="unitWeightKg" type="number" min="0" step="0.000001" required />
        <Field label="Unit volume (m³)" name="unitVolumeM3" type="number" min="0" step="0.000001" required />
      </div>
      <TextAreaField label="Specifications (JSON)" name="specifications" rows={6} placeholder='{"color":"red"}' />
    </FormCard>
  )
}
