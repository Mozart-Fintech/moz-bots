import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { IntegrationBlockType } from '@mozbot.io/schemas/features/blocks/integrations/constants'

const mozbotId = createId()

const chatwootTestWebsiteToken = 'tueXiiqEmrWUCZ4NUyoR7nhE'

test('should work as expected', async ({ page }) => {
  await createMozbots([
    {
      id: mozbotId,
      ...parseDefaultGroupWithBlock(
        {
          type: IntegrationBlockType.CHATWOOT,
          options: {
            websiteToken: chatwootTestWebsiteToken,
          },
        },
        { withGoButton: true }
      ),
    },
  ])
  await page.goto(`/${mozbotId}-public`)
  await page.getByRole('button', { name: 'Go' }).click()
  await expect(page.locator('#chatwoot_live_chat_widget')).toBeVisible()
})
