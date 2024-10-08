import { ShortTextInput } from '@/components'
import { SendButton } from '@/components/SendButton'
import { CommandData } from '@/features/commands/types'
import { InputSubmitContent } from '@/types'
import { isMobile } from '@/utils/isMobileSignal'
import type { EmailInputBlock } from '@mozbot.io/schemas'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { defaultEmailInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/email/constants'

type Props = {
  block: EmailInputBlock
  defaultValue?: string
  onSubmit: (value: InputSubmitContent) => void
}

export const EmailInput = (props: Props) => {
  const [inputValue, setInputValue] = createSignal(props.defaultValue ?? '')
  let inputRef: HTMLInputElement | undefined

  const handleInput = (inputValue: string) => setInputValue(inputValue)

  const checkIfInputIsValid = () =>
    inputRef?.value !== '' && inputRef?.reportValidity()

  const submit = () => {
    if (checkIfInputIsValid())
      props.onSubmit({ value: inputRef?.value ?? inputValue() })
    else inputRef?.focus()
  }

  const submitWhenEnter = (e: KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  onMount(() => {
    if (!isMobile() && inputRef) inputRef.focus({ preventScroll: true })
    window.addEventListener('message', processIncomingEvent)
  })

  onCleanup(() => {
    window.removeEventListener('message', processIncomingEvent)
  })

  const processIncomingEvent = (event: MessageEvent<CommandData>) => {
    const { data } = event
    if (!data.isFromMozbot) return
    if (data.command === 'setInputValue') setInputValue(data.value)
  }

  return (
    <div
      class="mozbot-input-form flex w-full gap-2 items-end max-w-[350px]"
      onKeyDown={submitWhenEnter}
    >
      <div class={'flex mozbot-input w-full'}>
        <ShortTextInput
          ref={inputRef}
          value={inputValue()}
          placeholder={
            props.block.options?.labels?.placeholder ??
            defaultEmailInputOptions.labels.placeholder
          }
          onInput={handleInput}
          type="email"
          autocomplete="email"
        />
      </div>
      <SendButton type="button" class="h-[56px]" on:click={submit}>
        {props.block.options?.labels?.button}
      </SendButton>
    </div>
  )
}
