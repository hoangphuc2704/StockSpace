import { Field, FileField, FormCard, SelectField, TextAreaField } from './FormControls'

// Form name: Owner profile
export function OwnerProfileForm() {
  return (
    <FormCard title="Owner profile" source="features/owner/pages/OwnerProfile.jsx" submitLabel="Save Profile">
      <Field label="Full name" name="fullName" placeholder="Enter first and last name" />
      <Field label="Phone number" name="phone" placeholder="Enter phone number" />
      <Field label="Email" name="email" type="email" placeholder="name@company.com" disabled />
      <Field label="Contact address" name="address" placeholder="Enter your address" />
      <TextAreaField label="Short introduction" name="introduction" placeholder="Describe a little about yourself..." />
    </FormCard>
  )
}

// Form name: Post a warehouse
export function WarehousePostForm() {
  return (
    <FormCard title="Post a warehouse" source="features/owner/pages/PostWarehouse.jsx" submitLabel="Post Warehouse">
      <Field label="Warehouse name" name="warehouseName" placeholder="For example: Thu Duc Distribution Hub" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" name="city" value="Ho Chi Minh City" readOnly />
        <SelectField label="Ward / Commune" name="ward" options={['Ward 1', 'Thu Duc Ward', 'Tan Phu Ward']} placeholder="Select a ward or commune" required />
      </div>
      <Field label="Street address" name="address" placeholder="House number, street name, industrial park..." required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Layout width" name="layoutWidth" type="number" placeholder="30" required />
        <Field label="Layout length" name="layoutLength" type="number" placeholder="40" required />
        <Field label="Height" name="height" type="number" placeholder="10" required />
        <Field label="Monthly price (VND)" name="price" type="number" placeholder="30000000" required />
      </div>
      <TextAreaField label="Description" name="description" placeholder="Describe access roads, operating hours, security, loading facilities and suitable goods..." />
      <SelectField label="Warehouse type" name="warehouseType" options={['Standard storage', 'Cold storage', 'Outdoor storage']} placeholder="Select type" required />
      <FileField label="Cover photo of warehouse representative" name="coverPhoto" accept="image/*" />
      <FileField label="Related photos (Optional)" name="images" accept="image/*" multiple />
    </FormCard>
  )
}

// Form name: Deposit to publish warehouse
export function DepositForm({ source = 'owner/pages/PostWarehouse.jsx', title = 'Deposit to publish warehouse' }) {
  return (
    <FormCard title={title} source={`features/${source}`} submitLabel="Confirm Deposit">
      <Field label="Deposit amount (VND)" name="amount" type="number" min="0" placeholder="For example: 2000000" required />
    </FormCard>
  )
}

// Form name: Owner dashboard deposit
export function OwnerDashboardDepositForm() {
  return <DepositForm source="owner/pages/OwnerDashboard.jsx" title="Owner dashboard deposit" />
}

// Form name: Open contract dispute
export function OwnerDisputeForm() {
  return (
    <FormCard title="Open contract dispute" source="features/owner/pages/OwnerContractsPage.jsx" submitLabel="Send Dispute">
      <TextAreaField label="Reason for dispute" name="reason" placeholder="Describe in detail the reason for the dispute..." required />
      <FileField label="Evidence" name="evidence" accept="image/*,.pdf,.doc,.docx" multiple />
    </FormCard>
  )
}

// Form name: Cancel contract
export function OwnerCancellationForm() {
  return (
    <FormCard title="Cancel contract" source="features/owner/pages/OwnerContractsPage.jsx" submitLabel="Cancel Contract">
      <TextAreaField label="Cancellation reason" name="reason" placeholder="Enter reason for cancelling this deal..." required />
    </FormCard>
  )
}

// Form name: Create owner contract
export function OwnerContractForm() {
  return (
    <FormCard title="Create owner contract" source="features/owner/pages/OwnerContractsPage.jsx" submitLabel="Create Contract">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start Date" name="startDate" type="date" required />
        <Field label="End Date" name="endDate" type="date" required />
      </div>
      <FileField label="Contract document" name="contractFile" accept=".pdf,.doc,.docx" />
    </FormCard>
  )
}
