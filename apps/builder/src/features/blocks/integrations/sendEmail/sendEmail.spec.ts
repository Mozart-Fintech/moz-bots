import test, { expect } from '@playwright/test'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { createId } from '@paralleldrive/cuid2'
import { getTestAsset } from '@/test/utils/playwright'
import { env } from '@mozbot.io/env'

const mozbotId = createId()

test.describe('Send email block', () => {
  test('its configuration should work', async ({ page }) => {
    if (
      !env.SMTP_USERNAME ||
      !env.SMTP_HOST ||
      !env.SMTP_PASSWORD ||
      !env.NEXT_PUBLIC_SMTP_FROM
    )
      throw new Error('SMTP_ env vars are missing')
    await importMozbotInDatabase(
      getTestAsset('mozbots/integrations/sendEmail.json'),
      {
        id: mozbotId,
      }
    )

    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.click('text=Configure...')
    await page.click(`text=notifications@mozbot.io`)
    await page.click('text=Connect new')
    const createButton = page.locator('button >> text=Create')
    await expect(createButton).toBeDisabled()
    await page.fill(
      '[placeholder="notifications@provider.com"]',
      env.SMTP_USERNAME
    )
    await page.fill('[placeholder="John Smith"]', 'John Smith')
    await page.fill('[placeholder="mail.provider.com"]', env.SMTP_HOST)
    await page.getByLabel('Username').fill(env.SMTP_USERNAME)
    await page.fill('[type="password"]', env.SMTP_PASSWORD)
    await page.fill('input[role="spinbutton"]', env.SMTP_PORT.toString())
    await expect(createButton).toBeEnabled()
    await createButton.click()

    await expect(
      page.locator(`button >> text=${env.SMTP_USERNAME}`)
    ).toBeVisible()

    await page.fill(
      '[placeholder="email1@gmail.com, email2@gmail.com"]',
      'email1@gmail.com, email2@gmail.com'
    )
    await expect(page.locator('span >> text=email1@gmail.com')).toBeVisible()
    await expect(page.locator('span >> text=email2@gmail.com')).toBeVisible()

    await page.fill(
      '[placeholder="email1@gmail.com, email2@gmail.com"]',
      'email1@gmail.com, email2@gmail.com'
    )
    await page.getByLabel('Subject:').fill('Email subject')
    await page.click('text="Custom content?"')
    await page.locator('textarea').last().fill('Here is my email')

    await page.click('text=Test')
    await page.locator('mozbot-standard').locator('text=Go').click()
    await expect(
      page.locator('text=Emails are not sent in preview mode >> nth=0')
    ).toBeVisible()
  })
})
