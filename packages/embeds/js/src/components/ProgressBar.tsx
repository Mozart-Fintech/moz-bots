type Props = {
  value: number
}

export const ProgressBar = (props: Props) => (
  <div class="mozbot-progress-bar-container">
    <div
      class="mozbot-progress-bar"
      style={{
        width: `${props.value}%`,
      }}
    />
  </div>
)
