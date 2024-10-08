import { SendButton } from '@/components/SendButton'
import { InputSubmitContent } from '@/types'
import { DateInputBlock } from '@mozbot.io/schemas'
import { createSignal } from 'solid-js'
import { defaultDateInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/date/constants'
import clsx from 'clsx'

type Props = {
  onSubmit: (inputValue: InputSubmitContent) => void
  options?: DateInputBlock['options']
  defaultValue?: string
}

export const DateForm = (props: Props) => {
  const [inputValues, setInputValues] = createSignal(
    parseDefaultValue(props.defaultValue ?? '')
  )

  const submit = () => {
    if (inputValues().from === '' && inputValues().to === '') return
    props.onSubmit({
      value: `${inputValues().from}${
        props.options?.isRange ? ` to ${inputValues().to}` : ''
      }`,
    })
  }

  return (
    <div class="mozbot-input-form flex gap-2 items-end">
      <form
        class={clsx(
          'flex mozbot-input',
          props.options?.isRange ? 'items-end' : 'items-center'
        )}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div class="flex flex-col">
          <div
            class={
              'flex items-center p-4 ' +
              (props.options?.isRange ? 'pb-0 gap-2' : '')
            }
          >
            {props.options?.isRange && (
              <p class="font-semibold">
                {props.options.labels?.from ??
                  defaultDateInputOptions.labels.from}
              </p>
            )}
            <input
              class="focus:outline-none flex-1 w-full text-input mozbot-date-input"
              style={{
                'min-height': '32px',
                'min-width': '100px',
                'font-size': '16px',
              }}
              value={inputValues().from}
              type={props.options?.hasTime ? 'datetime-local' : 'date'}
              onChange={(e) =>
                setInputValues({
                  ...inputValues(),
                  from: e.currentTarget.value,
                })
              }
              min={props.options?.min}
              max={props.options?.max}
              data-testid="from-date"
            />
          </div>
          {props.options?.isRange && (
            <div class="flex items-center p-4">
              {props.options.isRange && (
                <p class="font-semibold">
                  {props.options.labels?.to ??
                    defaultDateInputOptions.labels.to}
                </p>
              )}
              <input
                class="focus:outline-none flex-1 w-full text-input ml-2 mozbot-date-input"
                style={{
                  'min-height': '32px',
                  'min-width': '100px',
                  'font-size': '16px',
                }}
                value={inputValues().to}
                type={props.options.hasTime ? 'datetime-local' : 'date'}
                onChange={(e) =>
                  setInputValues({
                    ...inputValues(),
                    to: e.currentTarget.value,
                  })
                }
                min={props.options?.min}
                max={props.options?.max}
                data-testid="to-date"
              />
            </div>
          )}
        </div>
      </form>
      <SendButton class="h-[56px]" on:click={submit}>
        {props.options?.labels?.button}
      </SendButton>
    </div>
  )
}

const parseDefaultValue = (defaultValue: string) => {
  if (!defaultValue.includes('to')) return { from: defaultValue, to: '' }
  const [from, to] = defaultValue.split(' to ')
  return { from, to }
}
