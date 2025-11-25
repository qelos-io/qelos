import { ElMessageBox } from 'element-plus'
type MessageType = '' | 'success' | 'warning' | 'info' | 'error'

export interface ConfirmationContent {
  text?: string,
  title?: string,
  type?: MessageType
}

/**
 *
 * @param {Function} action
 * @param text
 * @param title
 * @param type
 * @returns {function(...[*]=)}
 */
export function useConfirmAction<T>(action: (item: T) => Promise<void> | void, { text = 'Are you sure?', title = '', type = 'warning' }: ConfirmationContent = {}) {
  return async (item: T) => {
    try {
      await ElMessageBox.confirm(text, title, { type });
      return await action(item);
    } catch {
      return undefined;
    }
  }
}
