/**
 * Shared client-side validation rules.
 *
 * Validators return an error message when the value is invalid and an empty
 * string when it is valid. Keeping this contract makes them easy to use from
 * forms that store errors by field as well as from forms with one error.
 */

export const VALIDATION_MESSAGES = {
  required: (label) => `${label} cannot be empty.`,
  email: 'Please enter a valid email address.',
  passwordMin: (length = 8) => `Password must be at least ${length} characters.`,
  passwordStrength:
    'Password must contain at least 1 uppercase letter, 1 lowercase letter and 1 number.',
  passwordMatch: 'Confirmation password does not match.',
  vietnamesePhone: 'Please enter a valid Vietnamese mobile number.',
  role: 'Please select a valid account role.',
  positiveAmount: 'Amount must be greater than 0.',
  positiveInteger: 'Enter a positive whole number.',
}

export const isEmpty = (value) => value === null || value === undefined || String(value).trim() === ''

export const required = (value, label = 'This field') =>
  isEmpty(value) ? VALIDATION_MESSAGES.required(label) : ''

export const maxLength = (value, length, message) =>
  !isEmpty(value) && String(value).length > length ? message : ''

export const email = (value) => {
  if (isEmpty(value)) return VALIDATION_MESSAGES.required('Email')
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
    ? ''
    : VALIDATION_MESSAGES.email
}

export const vietnameseMobile = (value) => {
  if (isEmpty(value)) return ''
  return /^(?:0[35789]\d{8}|\+84[35789]\d{8})$/.test(String(value).trim())
    ? ''
    : VALIDATION_MESSAGES.vietnamesePhone
}

export const password = (value, minLength = 8) => {
  if (isEmpty(value)) return VALIDATION_MESSAGES.required('Password')
  if (String(value).length < minLength) return VALIDATION_MESSAGES.passwordMin(minLength)
  return ''
}

export const strongPassword = (value, minLength = 8) => {
  const lengthError = password(value, minLength)
  if (lengthError) return lengthError
  return /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value)
    ? ''
    : VALIDATION_MESSAGES.passwordStrength
}

export const matchingPasswords = (value, confirmation) =>
  value === confirmation ? '' : VALIDATION_MESSAGES.passwordMatch

export const positiveNumber = (value, message = VALIDATION_MESSAGES.positiveAmount) => {
  if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) {
    return message
  }
  return Number(value) > 0 ? '' : message
}

export const nonNegativeNumber = (value, message = 'Value cannot be negative.') => {
  if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) {
    return message
  }
  return Number(value) >= 0 ? '' : message
}

export const positiveInteger = (value, message = VALIDATION_MESSAGES.positiveInteger) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? '' : message
}

export const validateFields = (values, rules) => {
  const errors = {}

  Object.entries(rules).forEach(([field, validators]) => {
    const validatorsList = Array.isArray(validators) ? validators : [validators]
    const error = validatorsList
      .map((validator) => validator(values[field], values))
      .find(Boolean)

    if (error) errors[field] = error
  })

  return errors
}

export const validateRegistrationForm = (form) =>
  validateFields(form, {
    fullName: [
      (value) => required(value, 'Full name'),
      (value) => maxLength(value, 150, 'Full name must not exceed 150 characters.'),
    ],
    email,
    password: (value) => strongPassword(value),
    confirmPassword: [
      (value) => required(value, 'Confirmation password'),
      (value, values) => matchingPasswords(values.password, value),
    ],
    phone: vietnameseMobile,
    agreeTerms: (value) => (value ? '' : 'You must agree to the Terms of Service.'),
    role: (value) =>
      value === 'ROLE_OWNER' || value === 'ROLE_TENANT' ? '' : VALIDATION_MESSAGES.role,
  })

export const validateLoginForm = ({ email: emailValue, password: passwordValue }) =>
  validateFields(
    { email: emailValue, password: passwordValue },
    {
      email,
      password: (value) => password(value, 6),
    }
  )

export const validateForgotPasswordForm = ({ email: emailValue }) =>
  validateFields({ email: emailValue }, { email })

export const validateResetPasswordForm = ({ email: emailValue, newPassword, confirmPassword, token }) =>
  validateFields(
    { email: emailValue, newPassword, confirmPassword, token },
    {
      email,
      newPassword: (value) => password(value, 6),
      confirmPassword: [
        (value) => required(value, 'Confirmation password'),
        (value, values) => matchingPasswords(values.newPassword, value),
      ],
      token: (value) => required(value, 'Reset link token'),
    }
  )

export const validateStaffInvitationForm = ({ token, password: value, confirmPassword }) =>
  validateFields(
    { token, password: value, confirmPassword },
    {
      token: (tokenValue) => required(tokenValue, 'Invitation token'),
      password: [
        (passwordValue) => strongPassword(passwordValue),
        (passwordValue) => maxLength(passwordValue, 100, 'Password must not exceed 100 characters.'),
      ],
      confirmPassword: [
        (confirmation) => required(confirmation, 'Confirmation password'),
        (confirmation, values) => matchingPasswords(values.password, confirmation),
      ],
    }
  )

export const validateUserForm = (form, isEdit = false) => {
  const rules = {
    fullName: (value) => required(value, 'Full name'),
  }

  if (!isEdit) {
    rules.email = email
    rules.password = (value) => password(value)
  }

  return validateFields(form, rules)
}

export const validateUserPasswordReset = ({ newPassword, confirmPassword }) =>
  validateFields(
    { newPassword, confirmPassword },
    {
      newPassword: (value) => password(value),
      confirmPassword: (value, values) => matchingPasswords(values.newPassword, value),
    }
  )

export const validatePackageForm = ({ name, price, durationDays, maxStaff }) =>
  validateFields(
    { name, price, durationDays, maxStaff },
    {
      name: (value) => required(value, 'Package name'),
      price: (value) => nonNegativeNumber(value, 'Price is not valid.'),
      durationDays: (value) => positiveInteger(value, 'Minimum duration 1 day.'),
      maxStaff: (value) => nonNegativeNumber(value, 'The employee limit cannot be negative.'),
    }
  )

export const validateDateRange = (startDate, endDate, message = 'End date must be after start date.') => {
  if (!startDate || !endDate) return required(startDate, 'Start date') || required(endDate, 'End date')
  return new Date(endDate) >= new Date(startDate) ? '' : message
}

export const validateInspectionResult = ({ notes, status, passedCount, checklistLength }) => {
  const notesError = required(notes, 'Report conclusion')
  if (notesError) return notesError

  return status === 'PASSED' && passedCount !== checklistLength
    ? 'All checklist items must pass before the inspection can be marked as passed.'
    : ''
}

export const firstError = (errors) => Object.values(errors).find(Boolean) || ''
