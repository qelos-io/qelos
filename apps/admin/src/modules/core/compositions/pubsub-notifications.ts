import pubsub from "@/services/pubsub";
import { ElMessage, ElNotification } from 'element-plus';

export function usePubSubNotifications() {
 pubsub.subscribe('notifications:success', (msg: string) => {
    ElNotification.success(msg);
 })
 pubsub.subscribe('notifications:error', (msg: string) => {
  ElNotification.error(msg);
 })
 pubsub.subscribe('notifications:warning', (msg: string) => {
  ElNotification.warning(msg);
 })
 pubsub.subscribe('notifications:info', (msg: string) => {
  ElNotification.info(msg);
 })

 pubsub.subscribe('notifications:show', ({ title, message, type, duration, showClose, dangerouslyUseHTMLString, position, offset }) => {
  ElNotification({
    title,
    message,
    type,
    duration,
    showClose,
    dangerouslyUseHTMLString,
    position,
    offset
  })
 })

 pubsub.subscribe('messages:success', (msg: string) => {
  ElMessage.success(msg);
 })

 pubsub.subscribe('messages:error', (msg: string) => {
  ElMessage.error(msg);
 })

 pubsub.subscribe('messages:warning', (msg: string) => {
  ElMessage.warning(msg);
 })

 pubsub.subscribe('messages:info', (msg: string) => {
  ElMessage.info(msg);
 })

 pubsub.subscribe('messages:show', ({ message, type, plain, showClose, center, dangerouslyUseHTMLString, grouping, duration }) => {
  ElMessage({
    message,
    type,
    plain,
    showClose,
    center,
    dangerouslyUseHTMLString,
    grouping,
    duration
  })
 })
}