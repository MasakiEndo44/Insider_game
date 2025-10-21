import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.2 AA Accessibility Compliance', () => {
  test('homepage has no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('create room page has no accessibility violations', async ({ page }) => {
    await page.goto('/create');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('join room page has no accessibility violations', async ({ page }) => {
    await page.goto('/join');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('game phases have no accessibility violations', async ({ page }) => {
    // Create and join room to access game phases
    await page.goto('/');
    // ... abbreviated setup ...

    // Test LOBBY phase
    let scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(scanResults.violations).toEqual([]);

    // Start game
    // ... progress to DEAL phase ...

    // Test DEAL phase
    scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(scanResults.violations).toEqual([]);

    // Test QUESTION phase
    // ... progress to QUESTION phase ...
    scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(scanResults.violations).toEqual([]);
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation works on all interactive elements', async ({ page }) => {
    await page.goto('/');

    // Tab through all focusable elements
    const focusableElements = await page.locator('button, a, input, select, textarea').all();

    for (const element of focusableElements) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused);
    }
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('forms have proper labels', async ({ page }) => {
    await page.goto('/create');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label', 'label-content-name-mismatch'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('page has valid HTML structure', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['page-has-heading-one', 'landmark-one-main', 'region'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('ARIA roles are used correctly', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules([
        'aria-allowed-attr',
        'aria-required-attr',
        'aria-valid-attr',
        'aria-valid-attr-value',
        'aria-roles',
      ])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('interactive elements have accessible names', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['button-name', 'link-name', 'input-button-name'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/');

    // Click first button to set focus
    const button = await page.locator('button').first();
    await button.focus();

    // Check if focus outline is visible
    const outline = await button.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
      };
    });

    // Either outline or custom focus-visible class should be present
    const hasFocusVisible = await button.evaluate((el) =>
      el.classList.contains('focus-visible') ||
      el.matches(':focus-visible')
    );

    expect(
      outline.outlineWidth !== '0px' ||
      outline.outlineStyle !== 'none' ||
      hasFocusVisible
    ).toBe(true);
  });

  test('no accessibility violations with reduced motion preference', async ({ page, context }) => {
    // Set prefers-reduced-motion
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }),
      });
    });

    await page.goto('/');

    // Verify animations are disabled
    const animationClass = await page.locator('.animate-fade-in, .animate-slide-up').first();
    const computedStyle = await animationClass.evaluate((el) => {
      return window.getComputedStyle(el).animationName;
    });

    expect(computedStyle).toBe('none');

    // Run standard accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
