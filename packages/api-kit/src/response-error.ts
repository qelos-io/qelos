export class ResponseError extends Error {
  internalMetadata: any;

  constructor(messageOrData: string | any & { message: string }, public status: number = 401, public responseMessage?: string) {
    const message: string = messageOrData.message || messageOrData;
    super(message);
    if (!this.responseMessage) {
      this.responseMessage = message;
    }
    if (typeof messageOrData === 'object') {
      this.internalMetadata = messageOrData;
    }
  }
}