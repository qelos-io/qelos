export class ResponseError extends Error {
  constructor(message: string, public status: number = 401, public responseMessage?: string) {
    super(message)
    if (!this.responseMessage) {
      this.responseMessage = message;
    }
  }
}