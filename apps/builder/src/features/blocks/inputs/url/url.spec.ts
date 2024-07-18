import test, { expect } from '@playwright/test'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { createId } from '@paralleldrive/cuid2'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { defaultUrlInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/url/constants'

test.describe('Url input block', () => {
  test('options should work', async ({ page }) => {
    const mozbotId = createId()
    await createMozbots([
      {
        id: mozbotId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.URL,
        }),
      },
    ])

    await page.goto(`/mozbots/${mozbotId}/edit`)

    await page.click('text=Test')
    await expect(
      page.locator(
        `input[placeholder="${defaultUrlInputOptions.labels.placeholder}"]`
      )
    ).toHaveAttribute('type', 'url')

    await page.click(`text=${defaultUrlInputOptions.labels.placeholder}`)
    await page.getByLabel('Placeholder:').fill('Your URL...')
    await expect(page.locator('text=Your URL...')).toBeVisible()
    await page.getByLabel('Button label:').fill('Go')
    await page.fill(
      `input[value="${defaultUrlInputOptions.retryMessageContent}"]`,
      'Try again bro'
    )

    await page.click('text=Restart')
    await page.locator(`input[placeholder="Your URL..."]`).fill('test')
    await page.locator('button >> text="Go"').click()
    await expect(page.locator('text=Try again bro')).toBeVisible()
    await page
      .locator(`input[placeholder="Your URL..."]`)
      .fill('https://website.com')
    await page.locator('button >> text="Go"').click()
    await expect(page.locator('text=https://website.com')).toBeVisible()
  })
})
