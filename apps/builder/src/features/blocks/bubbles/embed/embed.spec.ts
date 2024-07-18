import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { BubbleBlockType } from '@mozbot.io/schemas/features/blocks/bubbles/constants'

const pdfSrc = 'https://www.orimi.com/pdf-test.pdf'
const siteSrc = 'https://app.cal.com/baptistearno/15min'

test.describe.parallel('Embed bubble block', () => {
  test.describe('Content settings', () => {
    test('should import and parse embed correctly', async ({ page }) => {
      const mozbotId = createId()
      await createMozbots([
        {
          id: mozbotId,
          ...parseDefaultGroupWithBlock({
            type: BubbleBlockType.EMBED,
          }),
        },
      ])

      await page.goto(`/mozbots/${mozbotId}/edit`)
      await page.click('text=Click to edit...')
      await page.fill('input[placeholder="Paste the link or code..."]', pdfSrc)
      await expect(page.locator('text="Show embed"')).toBeVisible()
    })
  })

  test.describe('Preview', () => {
    test('should display embed correctly', async ({ page }) => {
      const mozbotId = createId()
      await createMozbots([
        {
          id: mozbotId,
          ...parseDefaultGroupWithBlock({
            type: BubbleBlockType.EMBED,
            content: {
              url: siteSrc,
              height: 700,
            },
          }),
        },
      ])

      await page.goto(`/mozbots/${mozbotId}/edit`)
      await page.click('text=Test')
      await expect(page.locator('iframe#embed-bubble-content')).toHaveAttribute(
        'src',
        siteSrc
      )
    })
  })
})
