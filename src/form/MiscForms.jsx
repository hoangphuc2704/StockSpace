import { CheckboxField, Field, FormCard, TextAreaField } from './FormControls'

// Form name: Withdraw money
export function WithdrawForm() {
  return (
    <FormCard title="Withdraw money" source="components/organisms/WithdrawModal.jsx" submitLabel="Send Withdrawal Request">
      <Field label="Amount (VND)" name="amount" type="number" min="0" placeholder="For example: 500000" required />
      <Field label="Bank name" name="bankName" placeholder="Vietcombank, TPBank..." required />
      <Field label="Bank account number" name="accountNumber" placeholder="Enter the bank account number" required />
      <Field label="Account holder" name="accountHolder" placeholder="CAPITALS WITHOUT diacritics" required />
    </FormCard>
  )
}

// Form name: Inspection result
export function InspectorInspectionForm() {
  return (
    <FormCard title="Inspection result" source="features/inspector/pages/InspectorInspectionsPage.jsx" submitLabel="Submit Inspection">
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Passed</button>
        <button type="button" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">Failed</button>
      </div>
      <TextAreaField label="Inspection notes" name="notes" placeholder="Describe the current condition, verified details, passed items, and required corrections..." />
      <CheckboxField label="I confirm that the inspection information is accurate." name="confirmed" required />
    </FormCard>
  )
}

// Form name: AI chat message
export function ChatMessageForm() {
  return (
    <FormCard title="AI chat message" source="features/chat/components/AIChatWidget.jsx" submitLabel="Send Message">
      <TextAreaField label="Message" name="message" placeholder="Ask a question..." rows={4} required />
    </FormCard>
  )
}
