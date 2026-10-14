import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { parseCompileError, type CompileError } from '../services/library';

/**
 * Saves a component and keeps the backend's compile error (message + code snippet) so the editor can
 * show it next to the code instead of in a toast that disappears.
 */
export function useComponentSave() {
  const saving = ref(false);
  const compileError = ref<CompileError | null>(null);

  async function run<T>(action: () => Promise<T>, failureMessage: string): Promise<T | null> {
    saving.value = true;
    compileError.value = null;
    try {
      return await action();
    } catch (error: any) {
      const parsed = parseCompileError(error?.response?.data?.reason);
      compileError.value = parsed;
      ElMessage.error(parsed ? 'The component did not compile. See the output panel.' : error?.response?.data?.message || failureMessage);
      return null;
    } finally {
      saving.value = false;
    }
  }

  return { saving, compileError, run };
}
