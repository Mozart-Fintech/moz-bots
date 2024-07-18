import { Answer, AnswerInput } from '@mozbot.io/schemas'
import { sendRequest } from '@mozbot.io/lib'

export const upsertAnswerQuery = async (
  answer: AnswerInput & { resultId: string } & { uploadedFiles?: boolean }
) =>
  sendRequest<Answer>({
    url: `/api/mozbots/t/results/r/answers`,
    method: 'PUT',
    body: answer,
  })
