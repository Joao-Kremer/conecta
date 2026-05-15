export interface PasswordValidationResult {
  valid: boolean;
  reason?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < 10) {
    return { valid: false, reason: 'Password must be at least 10 characters' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one letter' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one digit' };
  }
  return { valid: true };
}
