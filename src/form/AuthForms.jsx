import { CheckboxField, Field, FormCard, TextAreaField } from './FormControls'
import Button from '@/components/atoms/Button'
import { HiEye, HiEyeOff } from 'react-icons/hi'

const VIETNAMESE_MOBILE_PATTERN = '^(?:0[35789]\\d{8}|\\+84[35789]\\d{8})$'
const STRONG_PASSWORD_PATTERN = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$'

function PasswordToggle({ visible, onToggle }) {
  if (!onToggle) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
    </button>
  )
}

function AuthSubmitButton({ embedded, children, className = '', isLoading, size }) {
  if (!embedded) return undefined
  return (
    <Button type="submit" className={className} isLoading={isLoading} size={size}>
      {children}
    </Button>
  )
}

// Form name: Sign in
export function LoginForm({
  embedded = false,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
  showPassword,
  onTogglePassword,
  forgotPasswordLink,
}) {
  return (
    <FormCard
      title="Sign in"
      source="features/auth/pages/LoginPage.jsx"
      submitLabel="Sign In"
      embedded={embedded}
      onSubmit={onSubmit}
      isLoading={isLoading}
      showStatus={!embedded}
      extraContent={forgotPasswordLink}
      submitControl={embedded ? <AuthSubmitButton embedded isLoading={isLoading} className="h-11 w-full bg-amber-700">Sign In</AuthSubmitButton> : undefined}
    >
      <Field label="Email" name="email" type="email" placeholder="name@gmail.com" value={email} onChange={onEmailChange} maxLength={255} required />
      <Field
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={password}
        onChange={onPasswordChange}
        minLength={6}
        endAdornment={<PasswordToggle visible={showPassword} onToggle={onTogglePassword} />}
        required
      />
    </FormCard>
  )
}

// Form name: Create account
export function RegisterForm({
  embedded = false,
  fullName,
  email,
  password,
  confirmPassword,
  phone,
  agreeTerms,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onPhoneChange,
  onAgreeTermsChange,
  onSubmit,
  isLoading,
  showPassword,
  showConfirmPassword,
  onTogglePassword,
  onToggleConfirmPassword,
  role,
  termsLabel = 'I agree to the Terms of Service and Privacy Policy.',
}) {
  return (
    <FormCard
      title="Create account"
      source="features/auth/pages/RegisterPage.jsx"
      submitLabel="Create Account"
      embedded={embedded}
      onSubmit={onSubmit}
      isLoading={isLoading}
      showStatus={!embedded}
      submitControl={embedded ? <AuthSubmitButton embedded isLoading={isLoading} className="h-12 w-full bg-amber-500">Create Account</AuthSubmitButton> : undefined}
    >
      <input type="hidden" name="role" value={role || ''} />
      <Field label="Full Name" name="fullName" placeholder="John Doe" value={fullName} onChange={onFullNameChange} maxLength={150} required />
      <Field label="Email Address" name="email" type="email" placeholder="name@company.com" value={email} onChange={onEmailChange} maxLength={255} required />
      <Field
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={password}
        onChange={onPasswordChange}
        minLength={6}
        endAdornment={<PasswordToggle visible={showPassword} onToggle={onTogglePassword} />}
        required
      />
      <Field
        label="Confirm Password"
        name="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={confirmPassword}
        onChange={onConfirmPasswordChange}
        endAdornment={<PasswordToggle visible={showConfirmPassword} onToggle={onToggleConfirmPassword} />}
        required
      />
      <Field
        label="Phone Number"
        name="phone"
        type="tel"
        placeholder="0901234567"
        value={phone}
        onChange={onPhoneChange}
        pattern={VIETNAMESE_MOBILE_PATTERN}
        title="Enter a valid Vietnamese mobile number, for example 0901234567 or +84901234567."
      />
      <CheckboxField label={termsLabel} name="agreeTerms" checked={agreeTerms} onChange={onAgreeTermsChange} required />
    </FormCard>
  )
}

// Form name: Forgot password
export function ForgotPasswordForm({ embedded = false, email, onEmailChange, onSubmit, isLoading }) {
  return (
    <FormCard
      title="Forgot password"
      source="features/auth/pages/ForgotPasswordPage.jsx"
      submitLabel="Send Reset Link"
      embedded={embedded}
      onSubmit={onSubmit}
      isLoading={isLoading}
      showStatus={!embedded}
      submitControl={embedded ? <AuthSubmitButton embedded isLoading={isLoading} className="h-11 w-full bg-amber-700">Send Reset Link</AuthSubmitButton> : undefined}
    >
      <Field label="Email Address" name="email" type="email" placeholder="name@company.com" value={email} onChange={onEmailChange} maxLength={255} required />
    </FormCard>
  )
}

// Form name: Reset password
export function ResetPasswordForm({
  embedded = false,
  email,
  token,
  newPassword,
  confirmPassword,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  isLoading,
  showPassword,
  showConfirmPassword,
  onTogglePassword,
  onToggleConfirmPassword,
}) {
  return (
    <FormCard
      title="Reset password"
      source="features/auth/pages/ResetPasswordPage.jsx"
      submitLabel="Reset Password"
      embedded={embedded}
      onSubmit={onSubmit}
      isLoading={isLoading}
      showStatus={!embedded}
      submitControl={embedded ? <AuthSubmitButton embedded isLoading={isLoading} className="h-11 w-full bg-amber-700">Reset Password</AuthSubmitButton> : undefined}
    >
      <input type="hidden" name="email" value={email || ''} />
      <input type="hidden" name="token" value={token || ''} />
      <Field
        label="New Password"
        name="newPassword"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={newPassword}
        onChange={onNewPasswordChange}
        minLength={6}
        endAdornment={<PasswordToggle visible={showPassword} onToggle={onTogglePassword} />}
        required
      />
      <Field
        label="Confirm Password"
        name="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={confirmPassword}
        onChange={onConfirmPasswordChange}
        endAdornment={<PasswordToggle visible={showConfirmPassword} onToggle={onToggleConfirmPassword} />}
        required
      />
    </FormCard>
  )
}

// Form name: Accept staff invitation
export function StaffAcceptInvitationForm({
  embedded = false,
  token,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  isLoading,
  showPassword,
  showConfirmPassword,
  onTogglePassword,
  onToggleConfirmPassword,
  submitText = 'Activate Account',
  extraContent,
  afterActions,
}) {
  return (
    <FormCard
      title="Accept staff invitation"
      source="features/auth/pages/StaffAcceptInvitationPage.jsx"
      submitLabel="Activate Account"
      embedded={embedded}
      onSubmit={onSubmit}
      isLoading={isLoading}
      showStatus={!embedded}
      extraContent={extraContent}
      afterActions={afterActions}
      submitControl={embedded ? <AuthSubmitButton embedded isLoading={isLoading} className="mt-2 w-full">{submitText}</AuthSubmitButton> : undefined}
    >
      <input type="hidden" name="token" value={token || ''} />
      <p className="text-sm font-medium text-slate-600">Set up a password to activate your staff account.</p>
      <Field
        label="New password"
        name="newPassword"
        type={showPassword ? 'text' : 'password'}
        placeholder="At least 8 characters"
        value={password}
        onChange={onPasswordChange}
        minLength={8}
        maxLength={100}
        pattern={STRONG_PASSWORD_PATTERN}
        title="Password must contain at least 1 uppercase letter, 1 lowercase letter and 1 number."
        endAdornment={<PasswordToggle visible={showPassword} onToggle={onTogglePassword} />}
        required
      />
      <Field
        label="Confirm password"
        name="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        placeholder="Re-enter the password"
        value={confirmPassword}
        onChange={onConfirmPasswordChange}
        endAdornment={<PasswordToggle visible={showConfirmPassword} onToggle={onToggleConfirmPassword} />}
        required
      />
    </FormCard>
  )
}

// Form name: User profile
export function ProfileForm({ embedded = false, fullName, email, phone, bio, isActive = true, joinedText, onSubmit, isLoading }) {
  return (
    <FormCard
      title="User profile"
      source="features/auth/pages/Profile.jsx"
      submitLabel="Save Changes"
      embedded={embedded}
      onSubmit={onSubmit}
      isLoading={isLoading}
      showStatus={!embedded}
      submitControl={embedded ? <AuthSubmitButton embedded size="sm" isLoading={isLoading} className="px-6">Save changes</AuthSubmitButton> : undefined}
    >
      <Field label="Full name" name="fullName" placeholder="Enter your full name" defaultValue={fullName} required />
      <Field label="Email" name="email" type="email" placeholder="name@company.com" defaultValue={email} disabled />
      <Field label="Phone number" name="phone" type="tel" placeholder="0901234567" defaultValue={phone} />
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
        <span className="font-medium text-slate-700">Account Status</span>
        <span className={`ml-2 ${isActive ? 'text-emerald-600' : 'text-rose-600'}`}>{isActive ? 'Active' : 'Inactive'}</span>
        {joinedText && <span className="float-right text-xs text-slate-400">Joined {joinedText}</span>}
      </div>
      <TextAreaField label="Short introduction" name="bio" rows={4} placeholder="Describe a little about yourself..." defaultValue={bio} />
    </FormCard>
  )
}
