import { Field, FormCard, SelectField } from './FormControls'

// Form name: Warehouse filters
export function WarehouseFilterForm() {
  return (
    <FormCard title="Warehouse filters" source="features/warehouse/components/WarehouseFilters.jsx" submitLabel="Apply Filters">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum monthly price (VND)" name="minPrice" type="number" placeholder="Min" />
        <Field label="Maximum monthly price (VND)" name="maxPrice" type="number" placeholder="Max" />
      </div>
      <Field label="Minimum capacity (m²)" name="minCapacity" type="number" placeholder="e.g. 1000" />
    </FormCard>
  )
}

// Form name: Search warehouses
export function WarehouseSearchForm() {
  return (
    <FormCard title="Search warehouses" source="features/warehouse/pages/WarehouseListingPage.jsx" submitLabel="Search">
      <Field label="Search" name="searchTerm" placeholder="Search by city or hub name..." />
    </FormCard>
  )
}

// Form name: Inventory filters
export function InventoryFilterForm() {
  return (
    <FormCard title="Inventory filters" source="features/inventory/pages/InventoryPage.jsx" submitLabel="Apply Filters">
      <Field label="Search products" name="search" placeholder="Search products by name or SKU..." />
      <SelectField label="Warehouse" name="warehouse" options={['Main warehouse', 'Distribution hub']} placeholder="Select warehouse" />
    </FormCard>
  )
}

// Form name: Dispute filters
export function DisputeFilterForm() {
  return (
    <FormCard title="Dispute filters" source="features/dispute/pages/MyDisputesPage.jsx" submitLabel="Apply Filters">
      <Field label="Search" name="search" placeholder="Search by reason or complainant..." />
      <SelectField label="Status" name="status" options={['PENDING', 'RESOLVED', 'REJECTED']} placeholder="All status" />
    </FormCard>
  )
}

// Form name: Transaction filters
export function TransactionFilterForm() {
  return (
    <FormCard title="Transaction filters" source="features/admin/pages/TransactionsPage.jsx" submitLabel="Apply Filters">
      <Field label="Search" name="search" placeholder="Search by ID, type, payment code..." />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Type" name="type" options={['DEPOSIT', 'WITHDRAW', 'PAYMENT']} placeholder="All types" />
        <SelectField label="Status" name="status" options={['PENDING', 'SUCCESS', 'FAILED']} placeholder="All status" />
      </div>
    </FormCard>
  )
}
