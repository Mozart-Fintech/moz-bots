import * as Mozbot from '../../src'

beforeEach(() => {
  document.body.innerHTML = ''
})

it('should have the corresponding custom color', () => {
  expect.assertions(1)
  Mozbot.initBubble({
    button: { color: '#222222' },
    url: 'https://mozbot.io/mozbot-id',
  })
  const buttonElement = document.querySelector(
    '#mozbot-bubble > button'
  ) as HTMLElement
  expect(buttonElement.style.backgroundColor).toBe('rgb(34, 34, 34)')
})

it('should have the default svg icon', () => {
  expect.assertions(1)
  Mozbot.initBubble({
    url: 'https://mozbot.io/mozbot-id',
  })
  const buttonIconElement = document.querySelector(
    '#mozbot-bubble > button > .icon'
  ) as HTMLElement
  expect(buttonIconElement.tagName).toBe('svg')
})

it('should have the corresponding custom icon', () => {
  expect.assertions(1)
  Mozbot.initBubble({
    button: { iconUrl: 'https://web.com/icon.png' },
    url: 'https://mozbot.io/mozbot-id',
  })
  const buttonIconElement = document.querySelector(
    '#mozbot-bubble > button > .icon'
  ) as HTMLImageElement
  expect(buttonIconElement.src).toBe('https://web.com/icon.png')
})
