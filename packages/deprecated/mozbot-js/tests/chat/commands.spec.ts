import * as Mozbot from '../../src'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('openBubble', () => {
  it('should add the opened bubble', async () => {
    expect.assertions(3)
    const { open } = Mozbot.initBubble({
      url: 'https://mozbot.mozartfintech.com/mozbot-id',
    })
    const bubble = document.getElementById('mozbot-bubble') as HTMLDivElement
    expect(bubble.classList.contains('iframe-opened')).toBe(false)
    open()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(bubble.classList.contains('iframe-opened')).toBe(true)
    expect(open).not.toThrow()
  })

  it('should hide the proactive message', () => {
    expect.assertions(2)
    const { open, openProactiveMessage } = Mozbot.initBubble({
      url: 'https://mozbot.mozartfintech.com/mozbot-id',
      proactiveMessage: {
        textContent: 'Hi click here!',
        avatarUrl: 'https://website.com/my-avatar.png',
      },
    })
    const bubble = document.getElementById('mozbot-bubble') as HTMLDivElement
    if (openProactiveMessage) openProactiveMessage()
    expect(bubble.classList.contains('message-opened')).toBe(true)
    open()
    expect(bubble.classList.contains('message-opened')).toBe(false)
  })
})

describe('closeBubble', () => {
  it('should remove the corresponding class', async () => {
    expect.assertions(2)
    const { close, open } = Mozbot.initBubble({
      url: 'https://mozbot.mozartfintech.com/mozbot-id',
    })
    open()
    const bubble = document.getElementById('mozbot-bubble') as HTMLDivElement
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(bubble.classList.contains('iframe-opened')).toBe(true)
    close()
    expect(bubble.classList.contains('iframe-opened')).toBe(false)
  })
})

describe('openProactiveMessage', () => {
  it('should add the opened className', () => {
    expect.assertions(1)
    const { openProactiveMessage } = Mozbot.initBubble({
      proactiveMessage: {
        textContent: 'Hi click here!',
      },
      url: 'https://mozbot.mozartfintech.com/mozbot-id',
    })
    const bubble = document.getElementById('mozbot-bubble') as HTMLDivElement
    if (openProactiveMessage) openProactiveMessage()
    expect(bubble.classList.contains('message-opened')).toBe(true)
  })

  it("shouldn't be returned if no message", () => {
    expect.assertions(1)
    const { openProactiveMessage } = Mozbot.initBubble({
      url: 'mozbot-id',
    })
    expect(openProactiveMessage).toBeUndefined()
  })
})

describe('Request commands afterwards', () => {
  it('should return defined commands', async () => {
    Mozbot.initBubble({
      proactiveMessage: {
        textContent: 'Hi click here!',
      },
      url: 'https://mozbot.mozartfintech.com/mozbot-id',
    })

    const { close, open, openProactiveMessage } = Mozbot.getBubbleActions()
    expect(close).toBeDefined()
    expect(open).toBeDefined()
    expect(openProactiveMessage).toBeDefined()
    open()
    await new Promise((resolve) => setTimeout(resolve, 50))
    const bubble = document.getElementById('mozbot-bubble') as HTMLDivElement
    expect(bubble.classList.contains('iframe-opened')).toBe(true)
  })
})
