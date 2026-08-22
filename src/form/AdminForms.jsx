import { Field, FormCard, RadioGroup, SelectField, TextAreaField } from './FormControls'

// Form name: Reject withdrawal
export function AdminWithdrawalRejectForm() {
  return (
    <FormCard title="Reject withdrawal" source="features/admin/pages/AdminWithdrawalsPage.jsx" submitLabel="Reject Withdrawal">
      <TextAreaField label="Reason for refusal" name="adminNotes" placeholder="Enter the reason for rejecting the withdrawal request..." required />
    </FormCard>
  )
}

// Form name: Resolve dispute
export function AdminDisputeForm() {
  return (
    <FormCard title="Resolve dispute" source="features/admin/pages/DisputeManagementPage.jsx" submitLabel="Save Decision">
      <RadioGroup
        label="Decision"
        name="decision"
        options={[
          { value: 'ACCEPT', label: 'Accept complaint', defaultChecked: true },
          { value: 'REJECT', label: 'Reject complaint' },
        ]}
      />
      <TextAreaField label="Resolution note" name="note" placeholder="Enter the reason and decision to resolve the dispute..." required />
    </FormCard>
  )
}

// Form name: Create permission
export function PermissionForm() {
  return (
    <FormCard title="Create permission" source="features/admin/pages/PermissionManagementPage.jsx" submitLabel="Create Permission">
      <Field label="Permission code" name="permissionCode" placeholder="WAREHOUSE_MANAGE, USER_VIEW..." required />
      <TextAreaField label="Description" name="description" placeholder="Short description of this permission..." />
    </FormCard>
  )
}

// Form name: Create role
export function RoleForm() {
  return (
    <FormCard title="Create role" source="features/admin/pages/PermissionManagementPage.jsx" submitLabel="Create Role">
      <Field label="Role code" name="roleCode" placeholder="ADMIN, TENANT, OWNER..." required />
      <TextAreaField label="Description" name="description" placeholder="Short description of this role..." />
    </FormCard>
  )
}

// Form name: Assign permission
export function PermissionAssignmentForm() {
  return (
    <FormCard title="Assign permission" source="features/admin/pages/PermissionManagementPage.jsx" submitLabel="Assign Permission">
      <SelectField label="Permission" name="permission" options={['USER_VIEW', 'WAREHOUSE_MANAGE', 'INVENTORY_VIEW']} placeholder="Select permission" required />
    </FormCard>
  )
}

// Form name: Create subscription package
export function PackageForm() {
  return (
    <FormCard title="Create subscription package" source="features/admin/pages/Packages_SubcriptionsManagementPage.jsx" submitLabel="Create Package">
      <Field label="Package name" name="name" placeholder="Premium Storage Package" required />
      <Field label="Price" name="price" type="number" min="0" placeholder="0" required />
      <Field label="Duration (days)" name="duration" type="number" min="1" placeholder="30" required />
      <Field label="Warehouse limit" name="warehouseLimit" type="number" min="0" placeholder="5" required />
      <TextAreaField label="Description" name="description" placeholder="Description of package benefits..." />
    </FormCard>
  )
}

// Form name: System configuration
export function SystemConfigForm() {
  return (
    <FormCard title="System configuration" source="features/admin/pages/SystemConfigueManagementPage.jsx" submitLabel="Save Configuration">
      <SelectField label="Configuration key" name="key" options={['MAX_FILE_SIZE', 'DEFAULT_CURRENCY', 'MAINTENANCE_MODE']} placeholder="Select configuration" required />
      <Field label="Value" name="value" placeholder="Enter new configuration value..." required />
      <TextAreaField label="Note" name="note" placeholder="Notes on this configuration..." />
    </FormCard>
  )
}

// Form name: Create inspection template
export function InspectionTemplateForm() {
  return (
    <FormCard title="Create inspection template" source="features/admin/pages/InspectionsManagementPage.jsx" submitLabel="Create Template">
      <SelectField label="Warehouse type" name="warehouseType" options={['Standard storage', 'Cold storage', 'Outdoor storage']} placeholder="Select warehouse type" required />
    </FormCard>
  )
}

// Form name: Admin wallet deposit
export function AdminDepositForm() {
  return (
    <FormCard title="Admin wallet deposit" source="features/admin/pages/WalletAdmin.jsx" submitLabel="Confirm Deposit">
      <Field label="Deposit amount (VND)" name="amount" type="number" min="0" placeholder="Example: 2000000" required />
    </FormCard>
  )
}

// Form name: Create user
export function UserCreateForm() {
  return (
    <FormCard title="Create user" source="features/admin/pages/UserManagementPage.jsx" submitLabel="Create User">
      <Field label="Email" name="email" type="email" placeholder="user@example.com" required />
      <Field label="Full name" name="fullName" placeholder="Nguyen Van A" required />
      <Field label="Phone number" name="phone" type="tel" placeholder="0901234567" />
      <Field label="Password" name="password" type="password" placeholder="Minimum 8 characters" required />
    </FormCard>
  )
}

// Form name: Reset user password
export function UserPasswordForm() {
  return (
    <FormCard title="Reset user password" source="features/admin/pages/UserManagementPage.jsx" submitLabel="Update Password">
      <Field label="New password" name="password" type="password" placeholder="Minimum 8 characters" required />
      <Field label="Confirm password" name="confirmPassword" type="password" placeholder="Re-enter the password" required />
    </FormCard>
  )
}

// Form name: Create warehouse type
export function WarehouseTypeForm() {
  return (
    <FormCard title="Create warehouse type" source="features/admin/pages/WarehousesTypePage.jsx" submitLabel="Create Type">
      <Field label="Type name" name="name" placeholder="Cool storage, Cold storage, Outdoor storage..." required />
      <TextAreaField label="Description" name="description" placeholder="Describe the characteristics of this type of warehouse..." />
    </FormCard>
  )
}

// Form name: System policy
export function SystemPolicyForm() {
  return (
    <FormCard title="System policy" source="features/admin/pages/SystemPolicyPage.jsx" submitLabel="Save Policy">
      <Field label="Version" name="version" maxLength={50} placeholder="v1.0.0, 2026-Q1..." required />
      <TextAreaField label="Policy Content" name="content" rows={12} placeholder="Enter all terms and policies..." required />
    </FormCard>
  )
}
