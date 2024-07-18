import test, { expect } from '@playwright/test'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { createId } from '@paralleldrive/cuid2'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { defaultNumberInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/number/constants'

test.describe('Number input block', () => {
  test('options should work', async ({ page }) => {
    const mozbotId = createId()
    await createMozbots([
      {
        id: mozbotId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.NUMBER,
        }),
      },
    ])

    await page.goto(`/mozbots/${mozbotId}/edit`)

    await page.click('text=Test')
    await expect(
      page.locator(
        `input[placeholder="${defaultNumberInputOptions.labels.placeholder}"]`
      )
    ).toHaveAttribute('type', 'number')

    await page.click(`text=${defaultNumberInputOptions.labels.placeholder}`)
    await page.getByLabel('Placeholder:').fill('Your number...')
    await expect(page.locator('text=Your number...')).toBeVisible()
    await page.getByLabel('Button label:').fill('Go')
    await page.fill('[role="spinbutton"] >> nth=0', '0')
    await page.fill('[role="spinbutton"] >> nth=1', '100')
    await page.fill('[role="spinbutton"] >> nth=2', '10')

    await page.click('text=Restart')
    const input = page.locator(`input[placeholder="Your number..."]`)
    await input.fill('-1')
    await input.press('Enter')
    await input.fill('150')
    await input.press('Enter')
    await input.fill('50')
    await input.press('Enter')
    await expect(page.locator('text=50')).toBeVisible()
  })
})
