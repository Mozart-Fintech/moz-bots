import { env } from '@mozbot.io/env'

type Params = {
  debug: boolean
}

export const computeRiskLevel = (mozbot: any, params?: Params) => {
  const stringifiedMozbot = JSON.stringify(mozbot)
  if (
    env.RADAR_HIGH_RISK_KEYWORDS?.some((keyword) =>
      new RegExp(
        `(?<!(https?://|@)[^\\s"]*)\\b${keyword}${
          keyword.includes('$') ? '' : `\\b`
        }`,
        'gi'
      ).test(stringifiedMozbot)
    )
  ) {
    if (params?.debug) {
      console.log(
        'High risk keywords detected:',
        env.RADAR_HIGH_RISK_KEYWORDS?.find((keyword) =>
          new RegExp(
            `(?<!(https?://|@)[^\\s"]*)\\b${keyword}${
              keyword.includes('$') ? '' : `\\b`
            }`,
            'gi'
          ).test(stringifiedMozbot)
        )
      )
    }
    return 100
  }

  if (
    env.RADAR_CUMULATIVE_KEYWORDS?.some((set) =>
      set.every((keyword) =>
        keyword.some((k) =>
          new RegExp(
            `(?<!(https?://|@)[^\\s"]*)\\b${k}${k.includes('$') ? '' : `\\b`}`,
            'gi'
          ).test(stringifiedMozbot)
        )
      )
    )
  ) {
    if (params?.debug) {
      console.log(
        'Cumulative keywords detected:',
        env.RADAR_CUMULATIVE_KEYWORDS?.find((set) =>
          set.every((keyword) =>
            keyword.some((k) =>
              new RegExp(
                `(?<!(https?://|@)[^\\s"]*)\\b${k}${
                  k.includes('$') ? '' : `\\b`
                }`,
                'gi'
              ).test(stringifiedMozbot)
            )
          )
        )
      )
    }
    return 100
  }
  if (
    env.RADAR_INTERMEDIATE_RISK_KEYWORDS?.some((keyword) =>
      stringifiedMozbot.toLowerCase().includes(keyword)
    )
  )
    return 50
  return 0
}
