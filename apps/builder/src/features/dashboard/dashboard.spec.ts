import { createFolders } from '@/test/utils/databaseActions'
import { deleteButtonInConfirmDialog } from '@/test/utils/selectorUtils'
import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'

test('folders navigation should work', async ({ page }) => {
  await page.goto('/mozbots')
  const createFolderButton = page.locator('button:has-text("Create a folder")')
  await expect(createFolderButton).not.toBeDisabled()
  await createFolderButton.click()
  await page.fill('input[value="New folder"]', 'My folder #1')
  await page.press('input[value="My folder #1"]', 'Enter')
  await page.click('li:has-text("My folder #1")')
  await expect(page.locator('h1:has-text("My folder #1")')).toBeVisible()
  await createFolderButton.click()
  await page.fill('input', 'My folder #2')
  await page.press('input', 'Enter')

  await page.click('li:has-text("My folder #2")')
  await expect(page.locator('h1 >> text="My folder #2"')).toBeVisible()

  await page.click('text="Back"')
  await expect(page.locator('span >> text="My folder #2"')).toBeVisible()

  await page.click('text="Back"')
  await expect(page.locator('span >> text=My folder #1')).toBeVisible()
})

test('folders and mozbots should be deletable', async ({ page }) => {
  await createFolders([{ name: 'Folder #1' }, { name: 'Folder #2' }])
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  await createMozbots([
    { id: 'deletable-mozbot', name: 'Mozbot #1', createdAt: tomorrow },
  ])
  await page.goto('/mozbots')
  await page.click('button[aria-label="Show Folder #1 menu"]')
  await page.click('li:has-text("Folder #1") >> button:has-text("Delete")')
  await deleteButtonInConfirmDialog(page).click()
  await expect(page.locator('span >> text="Folder #1"')).not.toBeVisible()
  await page.click('button[aria-label="Show more options"]')
  await page.click('li:has-text("Mozbot #1") >> button:has-text("Delete")')
  await deleteButtonInConfirmDialog(page).click()
  await expect(page.locator('span >> text="Mozbot #1"')).not.toBeVisible()
})

test('folders and mozbots should be movable', async ({ page }) => {
  const droppableFolderId = createId()
  await createFolders([{ id: droppableFolderId, name: 'Droppable folder' }])
  await createMozbots([{ name: 'Draggable mozbot' }])
  await page.goto('/mozbots')
  const mozbotButton = page.locator('li:has-text("Draggable mozbot")')
  const folderButton = page.locator('li:has-text("Droppable folder")')
  await page.dragAndDrop(
    'li:has-text("Draggable mozbot")',
    'li:has-text("Droppable folder")'
  )
  await expect(mozbotButton).toBeHidden()
  await folderButton.click()
  await expect(page).toHaveURL(new RegExp(`/folders/${droppableFolderId}`))
  await expect(mozbotButton).toBeVisible()
  await page.dragAndDrop(
    'li:has-text("Draggable mozbot")',
    'a:has-text("Back")'
  )
  await expect(mozbotButton).toBeHidden()
  await page.click('a:has-text("Back")')
  await expect(mozbotButton).toBeVisible()
})

test.describe('Free user', () => {
  test("create folder shouldn't be available", async ({ page }) => {
    await page.goto('/mozbots')
    await page.click('text="Pro workspace"')
    await page.click('text="Free workspace"')
    await expect(page.locator('[data-testid="starter-lock-tag"]')).toBeVisible()
    await page.click('text=Create a folder')
    await expect(
      page.locator(
        'text="You need to upgrade your plan in order to create folders"'
      )
    ).toBeVisible()
  })
})
