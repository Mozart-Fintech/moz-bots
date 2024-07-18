import { createId } from '@paralleldrive/cuid2'
import test, { expect } from '@playwright/test'
import { getTestAsset } from './utils/playwright'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'

test('Payment redirection should work', async ({ page }) => {
  const mozbotId = createId()
  await importMozbotInDatabase(getTestAsset('mozbots/payment.json'), {
    id: mozbotId,
    publicId: `${mozbotId}-public`,
  })
  await page.goto(`/${mozbotId}-public`)
  const paypalButton = page
    .frameLocator('iframe[title="Secure payment input frame"]')
    .getByTestId('paypal')
  await expect(paypalButton).toBeVisible()
  await page.waitForTimeout(1000)
  await paypalButton.click()
  await page.getByRole('button', { name: 'Pay $' }).click()
  await page.getByRole('link', { name: 'Authorize Test Payment' }).click()
  await expect(page.getByText('Thank you!')).toBeVisible()
})
