// Validation côté client
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return {
    valid: re.test(email),
    error: re.test(email) ? null : 'Email invalide'
  }
}

export function validatePassword(password) {
  const errors = []
  
  if (password.length < 8) {
    errors.push('Au moins 8 caractères')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Au moins une minuscule')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Au moins un chiffre')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: getPasswordStrength(password)
  }
}

export function getPasswordStrength(password) {
  let strength = 0
  
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++
  
  if (strength <= 2) return { level: 'weak', label: 'Faible', color: 'red' }
  if (strength <= 4) return { level: 'medium', label: 'Moyen', color: 'yellow' }
  return { level: 'strong', label: 'Fort', color: 'green' }
}

export function validatePasswordMatch(password, confirmPassword) {
  return {
    valid: password === confirmPassword,
    error: password === confirmPassword ? null : 'Les mots de passe ne correspondent pas'
  }
}
