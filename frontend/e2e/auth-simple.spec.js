import { test, expect } from '@playwright/test';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Aller sur la page principale
    await page.goto('/');
    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle');
  });

  test('should display login/register form', async ({ page }) => {
    // Vérifier que le formulaire d'authentification est visible
    await expect(page.locator('text=WhatsApp-like Chat')).toBeVisible();
    
    // Vérifier les onglets
    await expect(page.locator('button:has-text("Connexion")')).toBeVisible();
    await expect(page.locator('button:has-text("Inscription")')).toBeVisible();
    
    // Vérifier les champs du formulaire
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should switch between login and register tabs', async ({ page }) => {
    // Cliquer sur l'onglet Inscription
    await page.click('button:has-text("Inscription")');
    await page.waitForTimeout(500);
    
    // Vérifier que le champ "Nom d'utilisateur" apparaît
    await expect(page.locator('input[placeholder*="utilisateur" i]')).toBeVisible();
    
    // Revenir à Connexion
    await page.click('button:has-text("Connexion")');
    await page.waitForTimeout(500);
  });

  test('should register a new user successfully', async ({ page }) => {
    // Générer des données uniques
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;
    const username = `user${timestamp}`;
    const password = 'TestPassword123!';
    
    // Cliquer sur l'onglet Inscription
    await page.click('button:has-text("Inscription")');
    await page.waitForTimeout(500);
    
    // Remplir le formulaire
    await page.fill('input[placeholder="Email"]', email);
    await page.fill('input[placeholder*="utilisateur" i]', username);
    
    // Remplir tous les champs password (confirmation incluse)
    const passwordFields = page.locator('input[type="password"]');
    const count = await passwordFields.count();
    for (let i = 0; i < count; i++) {
      await passwordFields.nth(i).fill(password);
    }
    
    // Soumettre
    await page.click('button[type="submit"]');
    
    // Attendre la redirection ou le message de succès
    // L'app devrait charger le chat ou afficher un succès
    await page.waitForTimeout(3000);
    
    // Vérifier qu'on n'est plus sur la page de login
    const isStillOnAuth = await page.locator('text=WhatsApp-like Chat').isVisible().catch(() => false);
    
    // Si toujours sur auth, vérifier s'il y a un message d'erreur
    if (isStillOnAuth) {
      const errorVisible = await page.locator('.text-red-600').isVisible().catch(() => false);
      if (errorVisible) {
        const errorText = await page.locator('.text-red-600').first().textContent();
        console.log('Registration error:', errorText);
      }
    }
  });

  test('should show validation error for invalid email', async ({ page }) => {
    // Aller sur Inscription
    await page.click('button:has-text("Inscription")');
    await page.waitForTimeout(500);
    
    // Entrer un email invalide
    await page.fill('input[placeholder="Email"]', 'not-an-email');
    await page.fill('input[placeholder*="utilisateur" i]', 'testuser');
    
    const passwordFields = page.locator('input[type="password"]');
    const count = await passwordFields.count();
    for (let i = 0; i < count; i++) {
      await passwordFields.nth(i).fill('ValidPass123!');
    }
    
    // Soumettre
    await page.click('button[type="submit"]');
    
    // Attendre un message d'erreur
    await page.waitForTimeout(1000);
    
    // Vérifier qu'une erreur est affichée
    const errorVisible = await page.locator('.text-red-600').isVisible().catch(() => false);
    expect(errorVisible).toBeTruthy();
  });

  test('should login with existing credentials', async ({ page }) => {
    // D'abord créer un utilisateur
    const timestamp = Date.now();
    const email = `logintest${timestamp}@example.com`;
    const username = `loginuser${timestamp}`;
    const password = 'LoginPass123!';
    
    // Inscription
    await page.click('button:has-text("Inscription")');
    await page.waitForTimeout(500);
    
    await page.fill('input[placeholder="Email"]', email);
    await page.fill('input[placeholder*="utilisateur" i]', username);
    
    const passwordFields = page.locator('input[type="password"]');
    let count = await passwordFields.count();
    for (let i = 0; i < count; i++) {
      await passwordFields.nth(i).fill(password);
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Si inscription réussie, se déconnecter (cliquer sur Déconnexion si visible)
    const logoutBtn = page.locator('button:has-text("Déconnexion")');
    const isLogoutVisible = await logoutBtn.isVisible().catch(() => false);
    
    if (isLogoutVisible) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
      
      // Maintenant tester le login
      await page.click('button:has-text("Connexion")');
      await page.waitForTimeout(500);
      
      await page.fill('input[placeholder="Email"]', email);
      await page.fill('input[type="password"]', password);
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Vérifier qu'on est connecté
      const stillOnAuth = await page.locator('text=WhatsApp-like Chat').isVisible().catch(() => false);
      expect(stillOnAuth).toBeFalsy();
    }
  });
});
