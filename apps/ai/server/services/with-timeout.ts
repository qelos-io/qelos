/**
 * Wait for `work`, but no longer than `ms`.
 *
 * The timer is cleared as soon as `work` settles, so `onTimeout` (which reports the timeout and returns the error
 * to reject with) runs only when the time really ran out.
 */
export async function withTimeout<T>(work: PromiseLike<T> | T, ms: number, onTimeout: () => Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try {
        reject(onTimeout());
      } catch (error) {
        reject(error);
      }
    }, ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
