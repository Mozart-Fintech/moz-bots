import { getTestAsset } from '@/test/utils/playwright'
import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { defaultTextInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/text/constants'

test.describe.parallel('Settings page', () => {
  test.describe('General', () => {
    test('should reflect change in real-time', async ({ page }) => {
      const mozbotId = createId()
      await importMozbotInDatabase(getTestAsset('mozbots/settings.json'), {
        id: mozbotId,
      })
      await page.goto(`/mozbots/${mozbotId}/settings`)

      await page.click('text="Remember user"')

      await expect(page.getByPlaceholder('Type your answer...')).toHaveValue(
        'Baptiste'
      )
      await page.click('text=Prefill input')
      await page.click('text=Theme')
      await expect(
        page.locator(
          `input[placeholder="${defaultTextInputOptions.labels.placeholder}"]`
        )
      ).toHaveValue('')
    })
  })

  test.describe('Typing emulation', () => {
    test('should be fillable', async ({ page }) => {
      const mozbotId = createId()
      await importMozbotInDatabase(getTestAsset('mozbots/settings.json'), {
        id: mozbotId,
      })
      await page.goto(`/mozbots/${mozbotId}/settings`)
      await expect(
        page.locator('a:has-text("Made with Mozbot")')
      ).toHaveAttribute('href', 'https://www.mozbot.io/?utm_source=litebadge')
      await page.click('button:has-text("Typing")')
      await page.fill('[data-testid="speed"] input', '350')
      await page.fill('[data-testid="max-delay"] input', '1.5')
      await page.click('text="Typing emulation" >> nth=-1')
      await expect(page.locator('[data-testid="speed"]')).toBeHidden()
      await expect(page.locator('[data-testid="max-delay"]')).toBeHidden()
    })
  })

  test.describe('Metadata', () => {
    test('should be fillable', async ({ page }) => {
      const favIconUrl = 'https://www.baptistearno.com/favicon.png'
      const imageUrl = 'https://www.baptistearno.com/images/site-preview.png'
      const mozbotId = createId()
      await importMozbotInDatabase(getTestAsset('mozbots/settings.json'), {
        id: mozbotId,
      })
      await page.goto(`/mozbots/${mozbotId}/settings`)
      await expect(
        page.locator(
          `input[placeholder="${defaultTextInputOptions.labels.placeholder}"]`
        )
      ).toHaveValue('Baptiste')
      await page.click('button:has-text("Metadata")')

      // Fav icon
      const favIconImg = page.locator('img >> nth=0')
      await expect(favIconImg).toHaveAttribute(
        'src',
        'http://localhost:3001/favicon.png'
      )
      await favIconImg.click()
      await expect(page.locator('text=Giphy')).toBeHidden()
      await page.click('button:has-text("Link")')
      await page.fill(
        'input[placeholder="Paste the image link..."]',
        favIconUrl
      )
      await expect(favIconImg).toHaveAttribute('src', favIconUrl)
      // Close popover
      await page.getByText('Image:').click()
      await page.waitForTimeout(1000)

      // Website image
      const websiteImg = page.locator('img >> nth=1')
      await expect(websiteImg).toHaveAttribute(
        'src',
        'http://localhost:3001/site-preview.png'
      )
      await websiteImg.click()
      await expect(page.locator('text=Giphy')).toBeHidden()
      await page.click('button >> text="Link"')
      await page.fill('input[placeholder="Paste the image link..."]', imageUrl)
      await expect(websiteImg).toHaveAttribute('src', imageUrl)

      await page.getByRole('textbox', { name: 'Title' }).fill('Awesome mozbot')
      await page
        .getByRole('textbox', { name: 'Description' })
        .fill('Lorem ipsum')
      await page.fill(
        'div[contenteditable=true]',
        '<script>Lorem ipsum</script>'
      )
    })
  })
})
