import {
  Background,
  ChatTheme,
  ContainerTheme,
  GeneralTheme,
  InputTheme,
  Theme,
} from '@mozbot.io/schemas'
import { BackgroundType } from '@mozbot.io/schemas/features/mozbot/theme/constants'

const cssVariableNames = {
  general: {
    bgImage: '--mozbot-container-bg-image',
    bgColor: '--mozbot-container-bg-color',
    fontFamily: '--mozbot-container-font-family',
  },
  chat: {
    hostBubbles: {
      bgColor: '--mozbot-host-bubble-bg-color',
      color: '--mozbot-host-bubble-color',
    },
    guestBubbles: {
      bgColor: '--mozbot-guest-bubble-bg-color',
      color: '--mozbot-guest-bubble-color',
    },
    inputs: {
      bgColor: '--mozbot-input-bg-color',
      color: '--mozbot-input-color',
      placeholderColor: '--mozbot-input-placeholder-color',
    },
    buttons: {
      bgColor: '--mozbot-button-bg-color',
      color: '--mozbot-button-color',
    },
  },
}

export const setCssVariablesValue = (
  theme: Theme | undefined,
  documentStyle: CSSStyleDeclaration
) => {
  if (!theme) return
  if (theme.general) setGeneralTheme(theme.general, documentStyle)
  if (theme.chat) setChatTheme(theme.chat, documentStyle)
}

const setGeneralTheme = (
  generalTheme: GeneralTheme,
  documentStyle: CSSStyleDeclaration
) => {
  const { background, font } = generalTheme
  if (background) setMozbotBackground
  if (font && typeof font === 'string')
    documentStyle.setProperty(cssVariableNames.general.fontFamily, font)
}

const setChatTheme = (
  chatTheme: ChatTheme,
  documentStyle: CSSStyleDeclaration
) => {
  const { hostBubbles, guestBubbles, buttons, inputs } = chatTheme
  if (hostBubbles) setHostBubbles(hostBubbles, documentStyle)
  if (guestBubbles) setGuestBubbles(guestBubbles, documentStyle)
  if (buttons) setButtons(buttons, documentStyle)
  if (inputs) setInputs(inputs, documentStyle)
}

const setHostBubbles = (
  hostBubbles: ContainerTheme,
  documentStyle: CSSStyleDeclaration
) => {
  if (hostBubbles.backgroundColor)
    documentStyle.setProperty(
      cssVariableNames.chat.hostBubbles.bgColor,
      hostBubbles.backgroundColor
    )
  if (hostBubbles.color)
    documentStyle.setProperty(
      cssVariableNames.chat.hostBubbles.color,
      hostBubbles.color
    )
}

const setGuestBubbles = (
  guestBubbles: any,
  documentStyle: CSSStyleDeclaration
) => {
  if (guestBubbles.backgroundColor)
    documentStyle.setProperty(
      cssVariableNames.chat.guestBubbles.bgColor,
      guestBubbles.backgroundColor
    )
  if (guestBubbles.color)
    documentStyle.setProperty(
      cssVariableNames.chat.guestBubbles.color,
      guestBubbles.color
    )
}

const setButtons = (
  buttons: ContainerTheme,
  documentStyle: CSSStyleDeclaration
) => {
  if (buttons.backgroundColor)
    documentStyle.setProperty(
      cssVariableNames.chat.buttons.bgColor,
      buttons.backgroundColor
    )
  if (buttons.color)
    documentStyle.setProperty(
      cssVariableNames.chat.buttons.color,
      buttons.color
    )
}

const setInputs = (inputs: InputTheme, documentStyle: CSSStyleDeclaration) => {
  if (inputs.backgroundColor)
    documentStyle.setProperty(
      cssVariableNames.chat.inputs.bgColor,
      inputs.backgroundColor
    )
  if (inputs.color)
    documentStyle.setProperty(cssVariableNames.chat.inputs.color, inputs.color)
  if (inputs.placeholderColor)
    documentStyle.setProperty(
      cssVariableNames.chat.inputs.placeholderColor,
      inputs.placeholderColor
    )
}

const setMozbotBackground = (
  background: Background,
  documentStyle: CSSStyleDeclaration
) => {
  documentStyle.setProperty(
    background?.type === BackgroundType.IMAGE
      ? cssVariableNames.general.bgImage
      : cssVariableNames.general.bgColor,
    background.type === BackgroundType.NONE
      ? 'transparent'
      : background.content ?? '#ffffff'
  )
}
