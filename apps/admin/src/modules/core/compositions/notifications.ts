import { ElNotification } from 'element-plus';
import { h } from 'vue';

export function useNotifications() {
  return {
    success: msg => ElNotification.success(msg),
    error: msg => ElNotification.error(msg),
  }
}
