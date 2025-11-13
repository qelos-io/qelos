import { ref } from 'vue'
import { useNotifications } from './notifications'

export interface IErrorMessages {
  error?: string | ((err: Error) => string | any),
  success?: string | ((data: any) => string | any),
}

export function useSubmitting(submitFn, messages: IErrorMessages = {}, afterSuccess?: Function) {
  const submitting = ref(false)
  const { error, success } = useNotifications()
  const errorMessage = typeof messages.error === 'function' ? messages.error : (err) => messages.error || err.message || err
  const successMessage = typeof messages.success === 'function' ? messages.success : () => messages.success

  function wrappedSubmit(...args) {
    submitting.value = true
    return submitFn(...args)
      .then(data => {
        const msg = successMessage(data)
        if (msg) {
          success(msg)
        }
        if (afterSuccess) {
          afterSuccess(data);
        }
        return data
      })
      .catch(err => {
        error(errorMessage(err))
      })
      .finally(() => submitting.value = false)
  }

  return { submitting, submit: wrappedSubmit }
}
