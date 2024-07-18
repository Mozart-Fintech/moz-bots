import test, { expect } from '@playwright/test'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { createId } from '@paralleldrive/cuid2'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { defaultTextInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/text/constants'
import { getTestAsset } from '@/test/utils/playwright'

test.describe.parallel('Text input block', () => {
  test('options should work', async ({ page }) => {
    const mozbotId = createId()
    await createMozbots([
      {
        id: mozbotId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.TEXT,
        }),
      },
    ])

    await page.goto(`/mozbots/${mozbotId}/edit`)

    await page.click('text=Test')
    await expect(
      page.locator(
        `input[placeholder="${defaultTextInputOptions.labels.placeholder}"]`
      )
    ).toHaveAttribute('type', 'text')

    await page.click(`text=${defaultTextInputOptions.labels.placeholder}`)
    await page.getByLabel('Placeholder:').fill('Your name...')
    await page.getByLabel('Button label:').fill('Go')
    await page.click('text=Long text?')

    await page.click('text=Restart')
    await expect(
      page.locator(`textarea[placeholder="Your name..."]`)
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go' })).toBeVisible()
  })

  test('hey boy', async ({ page }) => {
    const mozbotId = createId()
    await createMozbots([
      {
        id: mozbotId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.TEXT,
        }),
      },
    ])

    await page.goto(`/mozbots/${mozbotId}/edit`)

    await page.click(`text=${defaultTextInputOptions.labels.placeholder}`)
    await page.getByText('Allow attachments').click()
    await page.locator('[data-testid="variables-input"]').first().click()
    await page.getByText('var1').click()
    await page.getByRole('button', { name: 'Test' }).click()
    await page
      .getByPlaceholder('Type your answer...')
      .fill('Help me with these')
    await page.getByLabel('Add attachments').click()
    await expect(page.getByRole('menuitem', { name: 'Document' })).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: 'Photos & videos' })
    ).toBeVisible()
    await page
      .locator('#document-upload')
      .setInputFiles(getTestAsset('mozbots/theme.json'))
    await expect(page.getByText('theme.json')).toBeVisible()
    await page
      .locator('#photos-upload')
      .setInputFiles([getTestAsset('avatar.jpg'), getTestAsset('avatar.jpg')])
    await expect(page.getByRole('img', { name: 'avatar.jpg' })).toHaveCount(2)
    await page.getByRole('img', { name: 'avatar.jpg' }).first().hover()
    await page.getByLabel('Remove attachment').first().click()
    await expect(page.getByRole('img', { name: 'avatar.jpg' })).toHaveCount(1)
    await page.getByLabel('Send').click()
    await expect(
      page.getByRole('img', { name: 'Attached image 1' })
    ).toBeVisible()
    await expect(page.getByText('Help me with these')).toBeVisible()
  })
})
