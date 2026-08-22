import { Field, FormCard, SelectField, TextAreaField } from './FormControls'

// Form name: Create inbound receipt
export function InboundReceiptForm() {
  return (
    <FormCard title="Create inbound receipt" source="features/inbound/pages/InboundPage.jsx" submitLabel="Create Receipt">
      <SelectField label="Select Product (SKU)" name="sku" options={['[SKU-001] Electronics', '[SKU-002] Household appliances']} placeholder="Select product" required />
      <Field label="Total Quantity" name="totalQuantity" type="number" min="1" placeholder="0" required />
      <Field label="Product" name="product" placeholder="Select or enter product" required />
      <Field label="Quantity by bin" name="binQuantity" type="number" min="0" placeholder="0" />
      <TextAreaField label="Note (Optional)" name="note" placeholder="Enter notes..." />
    </FormCard>
  )
}

// Form name: Reject inbound receipt
export function InboundRejectForm() {
  return (
    <FormCard title="Reject inbound receipt" source="features/inbound/pages/InboundPage.jsx" submitLabel="Reject Receipt">
      <TextAreaField label="Reason" name="reason" placeholder="Enter reason..." required />
    </FormCard>
  )
}

// Form name: Create outbound receipt
export function OutboundReceiptForm() {
  return (
    <FormCard title="Create outbound receipt" source="features/outbound/pages/OutboundPage.jsx" submitLabel="Create Receipt">
      <SelectField label="Select Product (SKU)" name="sku" options={['[SKU-001] Electronics', '[SKU-002] Household appliances']} placeholder="Select product" required />
      <Field label="Total Quantity" name="totalQuantity" type="number" min="1" placeholder="0" required />
      <Field label="Pick from Bins" name="binQuantity" type="number" min="0" placeholder="0" />
      <TextAreaField label="Note (Optional)" name="note" placeholder="Enter notes..." />
    </FormCard>
  )
}

// Form name: Reject outbound receipt
export function OutboundRejectForm() {
  return (
    <FormCard title="Reject outbound receipt" source="features/outbound/pages/OutboundPage.jsx" submitLabel="Reject Receipt">
      <TextAreaField label="Reason" name="reason" placeholder="Enter reason..." required />
    </FormCard>
  )
}
