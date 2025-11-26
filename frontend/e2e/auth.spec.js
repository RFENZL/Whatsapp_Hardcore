import { test, expect } from '@playwright/test'

test.describe('User Registration', () => {
  test('should complete registration flow successfully', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login/register page if not authenticated
    await expect(page).toHaveURL(/\/(login|register|auth)/)

    // Fill registration form
    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    const username = `user${timestamp}`
    const password = 'Test123!@#'

    // Look for registration form fields
    await page.fill('input[type="email"]', email)
    await page.fill('input[placeholder*="nom" i], input[name*="username" i]', username)
    
    // Fill password fields
    const passwordInputs = await page.locator('input[type="password"]').all()
    for (const input of passwordInputs) {
      await input.fill(password)
    }

    // Submit registration
    await page.click('button[type="submit"], button:has-text("Inscription"), button:has-text("Register")')

    // Should redirect to main app after successful registration
    await page.waitForURL(/\/(chat|conversations|app)/, { timeout: 10000 })

    // Verify user is logged in
    await expect(page.locator(`text=${username}`).first()).toBeVisible({ timeout: 5000 })
  })

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/')

    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[placeholder*="nom" i], input[name*="username" i]', 'testuser')
    await page.fill('input[type="password"]', 'password123')

    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page.locator('text=/email.*invalid/i, text=/invalid.*email/i')).toBeVisible({ timeout: 3000 })
  })

  test('should show error for weak password', async ({ page }) => {
    await page.goto('/')

    await page.fill('input[type="email"]', `test${Date.now()}@example.com`)
    await page.fill('input[placeholder*="nom" i], input[name*="username" i]', 'testuser')
    await page.fill('input[type="password"]', '123')

    await page.click('button[type="submit"]')

    // Should show password validation error
    await expect(page.locator('text=/password.*short/i, text=/password.*weak/i')).toBeVisible({ timeout: 3000 })
  })
})

test.describe('User Login', () => {
  const testUser = {
    email: `testlogin${Date.now()}@example.com`,
    username: `loginuser${Date.now()}`,
    password: 'Test123!@#'
  }

  test.beforeEach(async ({ page }) => {
    // Register a user first
    await page.goto('/')
    
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[placeholder*="nom" i], input[name*="username" i]', testUser.username)
    
    const passwordInputs = await page.locator('input[type="password"]').all()
    for (const input of passwordInputs) {
      await input.fill(testUser.password)
    }
    
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(chat|conversations|app)/, { timeout: 10000 })

    // Logout
    await page.click('button:has-text("Déconnexion"), button:has-text("Logout"), [data-testid="logout"]')
    await page.waitForURL(/\/(login|register|auth)/, { timeout: 5000 })
  })

  test('should login with correct credentials', async ({ page }) => {
    await page.goto('/')

    // Switch to login tab if needed
    const loginTab = page.locator('text=/^Login$|^Connexion$/i')
    if (await loginTab.isVisible()) {
      await loginTab.click()
    }

    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')

    // Should login successfully
    await page.waitForURL(/\/(chat|conversations|app)/, { timeout: 10000 })
    await expect(page.locator(`text=${testUser.username}`).first()).toBeVisible()
  })

  test('should show error for incorrect password', async ({ page }) => {
    await page.goto('/')

    const loginTab = page.locator('text=/^Login$|^Connexion$/i')
    if (await loginTab.isVisible()) {
      await loginTab.click()
    }

    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error
    await expect(page.locator('text=/incorrect|invalid|wrong/i')).toBeVisible({ timeout: 3000 })
  })

  test('should show error for non-existent user', async ({ page }) => {
    await page.goto('/')

    const loginTab = page.locator('text=/^Login$|^Connexion$/i')
    if (await loginTab.isVisible()) {
      await loginTab.click()
    }

    await page.fill('input[type="email"]', 'nonexistent@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=/not found|incorrect|invalid/i')).toBeVisible({ timeout: 3000 })
  })
})
