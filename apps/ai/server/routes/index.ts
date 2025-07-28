import { app as getApp } from '@qelos/api-kit'
import { chatCompletionRouter } from './chat-completion'
import { sourcesChatCompletionRouter } from './sources-chat-completion'

export async function loadRoutes() {
  const app = getApp()
  app.use(sourcesChatCompletionRouter())
  app.use(chatCompletionRouter())
}
