import test, { expect } from '@playwright/test'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { createId } from '@paralleldrive/cuid2'
import { IntegrationBlockType } from '@mozbot.io/schemas/features/blocks/integrations/constants'
import { defaultChatwootOptions } from '@mozbot.io/schemas/features/blocks/integrations/chatwoot/constants'

const mozbotId = createId()

const chatwootTestWebsiteToken = 'tueXiiqEmrWUCZ4NUyoR7nhE'

test.describe('Chatwoot block', () => {
  test('should be configurable', async ({ page }) => {
    await createMozbots([
      {
        id: mozbotId,
        ...parseDefaultGroupWithBlock({
          type: IntegrationBlockType.CHATWOOT,
        }),
      },
    ])

    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.getByText('Configure...').click()
    await expect(page.getByLabel('Base URL')).toHaveAttribute(
      'value',
      defaultChatwootOptions.baseUrl
    )
    await page.getByLabel('Website token').fill(chatwootTestWebsiteToken)
    await expect(page.getByText('Open Chatwoot')).toBeVisible()
    await page.getByRole('button', { name: 'Set user details' }).click()
    await page.getByLabel('ID').fill('123')
    await page.getByLabel('Name').fill('John Doe')
    await page.getByLabel('Email').fill('john@email.com')
    await page.getByLabel('Avatar URL').fill('https://domain.com/avatar.png')
    await page.getByLabel('Phone number').fill('+33654347543')
    await page.getByRole('button', { name: 'Test', exact: true }).click()
    await expect(
      page.getByText('Chatwoot block is not supported in preview').nth(0)
    ).toBeVisible()
  })
})
