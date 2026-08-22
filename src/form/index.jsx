export {
  AdminDepositForm,
  AdminDisputeForm,
  AdminWithdrawalRejectForm,
  InspectionTemplateForm,
  PackageForm,
  PermissionAssignmentForm,
  PermissionForm,
  RoleForm,
  SystemConfigForm,
  SystemPolicyForm,
  UserCreateForm,
  UserPasswordForm,
  WarehouseTypeForm,
} from './AdminForms'
export { ForgotPasswordForm, LoginForm, ProfileForm, RegisterForm, ResetPasswordForm, StaffAcceptInvitationForm } from './AuthForms'
export { DisputeFilterForm, InventoryFilterForm, TransactionFilterForm, WarehouseFilterForm, WarehouseSearchForm } from './FilterForms'
export { CategoryForm, InventoryAuditForm, InventoryAuditRejectForm, SkuForm, TenantCategoryForm, TenantSkuForm } from './InventoryForms'
export { ChatMessageForm, InspectorInspectionForm, WithdrawForm } from './MiscForms'
export { DepositForm, OwnerCancellationForm, OwnerContractForm, OwnerDashboardDepositForm, OwnerDisputeForm, OwnerProfileForm, WarehousePostForm } from './OwnerForms'
export { StaffAssignmentForm, StaffInviteForm, TenantContractDisputeForm, TenantContractRejectForm, TenantDepositForm } from './TenantForms'
export { InboundReceiptForm, InboundRejectForm, OutboundReceiptForm, OutboundRejectForm } from './WmsForms'
export { FormShell } from './FormControls'

import { AdminDisputeForm, AdminDepositForm, AdminWithdrawalRejectForm, InspectionTemplateForm, PackageForm, PermissionAssignmentForm, PermissionForm, RoleForm, SystemConfigForm, SystemPolicyForm, UserCreateForm, UserPasswordForm, WarehouseTypeForm } from './AdminForms'
import { ForgotPasswordForm, LoginForm, ProfileForm, RegisterForm, ResetPasswordForm, StaffAcceptInvitationForm } from './AuthForms'
import { DisputeFilterForm, InventoryFilterForm, TransactionFilterForm, WarehouseFilterForm, WarehouseSearchForm } from './FilterForms'
import { CategoryForm, InventoryAuditForm, InventoryAuditRejectForm, SkuForm, TenantCategoryForm, TenantSkuForm } from './InventoryForms'
import { ChatMessageForm, InspectorInspectionForm, WithdrawForm } from './MiscForms'
import { DepositForm, OwnerCancellationForm, OwnerContractForm, OwnerDashboardDepositForm, OwnerDisputeForm, OwnerProfileForm, WarehousePostForm } from './OwnerForms'
import { StaffAssignmentForm, StaffInviteForm, TenantContractDisputeForm, TenantContractRejectForm, TenantDepositForm } from './TenantForms'
import { InboundReceiptForm, InboundRejectForm, OutboundReceiptForm, OutboundRejectForm } from './WmsForms'

const formGroups = [
  {
    title: 'Authentication and profile',
    forms: [LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, StaffAcceptInvitationForm, ProfileForm],
  },
  {
    title: 'Warehouse owner',
    forms: [OwnerProfileForm, WarehousePostForm, DepositForm, OwnerDashboardDepositForm, OwnerDisputeForm, OwnerCancellationForm, OwnerContractForm],
  },
  {
    title: 'Inventory and warehouse operations',
    forms: [CategoryForm, SkuForm, InventoryAuditForm, InventoryAuditRejectForm, InboundReceiptForm, InboundRejectForm, OutboundReceiptForm, OutboundRejectForm],
  },
  {
    title: 'Tenant',
    forms: [TenantCategoryForm, TenantSkuForm, StaffInviteForm, StaffAssignmentForm, TenantContractDisputeForm, TenantContractRejectForm, TenantDepositForm],
  },
  {
    title: 'Administration',
    forms: [AdminWithdrawalRejectForm, AdminDisputeForm, PermissionForm, RoleForm, PermissionAssignmentForm, PackageForm, SystemConfigForm, InspectionTemplateForm, AdminDepositForm, UserCreateForm, UserPasswordForm, WarehouseTypeForm, SystemPolicyForm],
  },
  {
    title: 'Other forms and filters',
    forms: [WithdrawForm, InspectorInspectionForm, ChatMessageForm, WarehouseFilterForm, WarehouseSearchForm, InventoryFilterForm, DisputeFilterForm, TransactionFilterForm],
  },
]

export function FormsCatalog() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">StockSpace forms</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Generated form collection</h1>
          <p className="mt-2 max-w-3xl text-slate-600">An independent preview of the input forms currently present in the application. Submitting a preview does not call the backend.</p>
        </header>

        {formGroups.map((group) => (
          <section key={group.title} className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-slate-900">{group.title}</h2>
            <div className="grid gap-5 xl:grid-cols-2">
              {group.forms.map((FormComponent) => (
                <FormComponent key={FormComponent.name} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

export default FormsCatalog
