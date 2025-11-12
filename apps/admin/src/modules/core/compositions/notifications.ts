import { ElNotification } from 'element-plus';
import { h } from 'vue';

export function useNotifications() {
  return {
    success: msg => ElNotification.success(msg),
    error: msg => {
      // Check if the error message contains code snippets (lines with | pipe character)
      const hasCodeSnippet = typeof msg === 'string' && /^\s*\d+\s*\|/m.test(msg);
      
      if (hasCodeSnippet) {
        // Split into error message and code snippet
        const parts = msg.split('\n\n');
        const errorMsg = parts[0];
        const codeSnippet = parts.slice(1).join('\n\n');
        
        return ElNotification.error({
          title: 'Compilation Error',
          message: h('div', { class: 'compilation-error' }, [
            h('div', { class: 'error-message' }, errorMsg),
            codeSnippet ? h('pre', { class: 'code-snippet' }, codeSnippet) : null
          ]),
          dangerouslyUseHTMLString: false,
          duration: 10000, // 10 seconds for compilation errors
          customClass: 'compilation-error-notification',
        });
      }
      
      return ElNotification.error(msg);
    },
  }
}
