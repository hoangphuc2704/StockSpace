import { Field, FileField, FormCard, SelectField, TextAreaField } from './FormControls'

// Form name: Invite warehouse staff
export function StaffInviteForm() {
  return (
    <FormCard title="Invite warehouse staff" source="features/tenant/pages/TenantStaffManagementPage.jsx" submitLabel="Send Invitations">
      <p className="text-sm text-slate-500">The activation link is valid for 48 hours.</p>
      <Field label="Email" name="email" type="email" placeholder="nhanvien@gmail.com" required />
      <Field label="Full name" name="fullName" placeholder="Nguyen Van A" required />
      <Field label="Phone number" name="phone" type="tel" placeholder="0987654321" />
    </FormCard>
  )
}

// Form name: Assign warehouse staff
export function StaffAssignmentForm() {
  return (
    <FormCard title="Assign warehouse staff" source="features/tenant/pages/TenantStaffManagementPage.jsx" submitLabel="Add Assignment">
      <SelectField label="Select warehouse" name="warehouseId" options={['Main warehouse', 'Distribution hub']} placeholder="Select warehouse" required />
      <Field label="Title displayed" name="customTitle" placeholder="Example: Storekeeper Shift 1" />
      <Field label="Notes" name="notes" placeholder="Assignment notes..." />
    </FormCard>
  )
}

// Form name: Open tenant contract dispute
export function TenantContractDisputeForm() {
  return (
    <FormCard title="Open tenant contract dispute" source="features/tenant/pages/TenantContractsPage.jsx" submitLabel="Send Dispute">
      <TextAreaField label="Reason for dispute" name="reason" placeholder="Describe in detail the reason for the dispute..." required />
      <FileField label="Evidence" name="evidence" accept="image/*,.pdf,.doc,.docx" multiple />
    </FormCard>
  )
}

// Form name: Reject tenant contract
export function TenantContractRejectForm() {
  return (
    <FormCard title="Reject tenant contract" source="features/tenant/pages/TenantContractsPage.jsx" submitLabel="Reject Contract">
      <TextAreaField label="Reason" name="reason" placeholder="Describe why you are rejecting this contract..." required />
    </FormCard>
  )
}

// Form name: Tenant wallet deposit
export function TenantDepositForm() {
  return (
    <FormCard title="Tenant wallet deposit" source="features/tenant/pages/WalletTenant.jsx" submitLabel="Confirm Deposit">
      <Field label="Deposit amount (VND)" name="amount" type="number" min="0" placeholder="For example: 2000000" required />
    </FormCard>
  )
}
