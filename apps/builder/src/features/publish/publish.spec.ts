import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'

test('should not be able to submit taken url ID', async ({ page }) => {
  const takenmozbotId = createId()
  const mozbotId = createId()
  await createMozbots([
    {
      id: takenmozbotId,
      ...parseDefaultGroupWithBlock({
        type: InputBlockType.TEXT,
      }),
      publicId: 'taken-url-id',
    },
  ])
  await createMozbots([
    {
      id: mozbotId,
      ...parseDefaultGroupWithBlock({
        type: InputBlockType.TEXT,
      }),
      publicId: mozbotId + '-public',
    },
  ])
  await page.goto(`/mozbots/${mozbotId}/share`)
  await page.getByText(`${mozbotId}-public`).click()
  await page.getByRole('textbox').fill('id with spaces')
  await page.getByRole('textbox').press('Enter')
  await expect(
    page
      .getByText('Can only contain lowercase letters, numbers and dashes.')
      .nth(0)
  ).toBeVisible()
  await page.getByText(`${mozbotId}-public`).click()
  await page.getByRole('textbox').fill('taken-url-id')
  await page.getByRole('textbox').press('Enter')
  await expect(page.getByText('ID is already taken').nth(0)).toBeVisible()
  await page.getByText(`${mozbotId}-public`).click()
  await page.getByRole('textbox').fill('new-valid-id')
  await page.getByRole('textbox').press('Enter')
  await expect(page.getByText('new-valid-id')).toBeVisible()
  await expect(page.getByText(`${mozbotId}-public`)).toBeHidden()
})
