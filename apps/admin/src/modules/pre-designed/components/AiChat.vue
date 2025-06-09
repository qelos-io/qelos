<template>
  <div
  class="ai-chat"
  @dragover.prevent="onDragOver"
  @drop.prevent="onFileDrop"
  @dragenter.prevent="onDragEnter"
  @dragleave.prevent="onDragLeave"
>
    <div class="chat-window" ref="chatWindow">
      <div v-if="messages.length === 0" class="ai-initial-message">
        <div class="ai-initial-title">🤖 I'm your AI assistant</div>
        <div class="ai-initial-desc">How can I help you?<br />
          <span style="color: var(--el-color-primary);">You can also drop files anywhere in this chat.</span>
        </div>
      </div>
      <transition-group name="chat-bubble" tag="div">
        <div
          v-for="(msg, idx) in messages"
          :key="msg.id"
          :class="['bubble', msg.role]"
        >
          <div class="bubble-header">
            <span class="avatar">
              <el-icon v-if="msg.role === 'user'"><UserFilled /></el-icon>
              <el-icon v-else><Cpu /></el-icon>
            </span>
            <span class="meta">{{ msg.role === 'user' ? 'You' : 'AI' }} · {{ formatTime(msg.time) }}</span>
          </div>
          <div class="bubble-content">
            <span v-if="msg.type === 'text'">{{ msg.content }}</span>
            <div v-if="msg.type === 'file'" class="file-attachment-preview">
              <font-awesome-icon :icon="['fas', fileIconClass(msg.filename)]" />
              <span>{{ msg.filename }}</span>
            </div>
          </div>
        </div>
      </transition-group>
      <div v-if="loading" class="stream-indicator">
        <el-icon class="spin"><Loading /></el-icon> AI is typing...
      </div>
    </div>
    <transition name="fade">
      <div v-if="dropActive" class="drag-overlay">
        <el-icon style="font-size:2em;"><UploadFilled /></el-icon>
        <div>Drop files to attach</div>
      </div>
    </transition>
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      multiple
      accept=".txt,.csv,.json,.md"
      @change="onFileChange"
      style="display: none;"
    />
    <div class="attached-files" v-if="attachedFiles.length">
      <el-tag
        v-for="(file, idx) in attachedFiles"
        :key="file.id"
        closable
        @close="removeFile(idx)"
        class="file-chip"
      >
        <el-icon><Document /></el-icon> {{ file.name }}
      </el-tag>
    </div>
    <form class="input-row" @submit.prevent="onSend">
      <div class="input-group">
        <el-input
          v-model="input"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 6 }"
          placeholder="Type your message..."
          size="large"
          :disabled="loading"
          ref="inputRef"
          autocomplete="off"
          aria-label="Message input"
          @keydown.enter="onInputEnter"
          class="ai-textarea"
          style="flex: 1; min-width: 0;"
        />
        <button
          class="ai-send-btn"
          :disabled="!canSend || loading"
          type="submit"
          aria-label="Send"
          style="margin-left: 0.5em; flex-shrink: 0; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;"
        >
          <svg class="send-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 21L21 12L3 3V10L17 12L3 14V21Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, nextTick, watch } from 'vue';
import { ElInput, ElButton, ElTag, ElIcon, ElMessage } from 'element-plus';
import { UploadFilled, Promotion, Document, Loading, UserFilled, Cpu } from '@element-plus/icons-vue';

const props = defineProps<{ url: string }>();

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  type: 'text' | 'file';
  filename?: string;
}

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  content: string;
}

const input = ref('');
const inputRef = ref();
const chatWindow = ref();
const fileInputRef = ref<HTMLInputElement>();
const dropActive = ref(false);
let dragCounter = 0;

function onDragOver(e: DragEvent) {
  e.preventDefault();
}
function onDragEnter(e: DragEvent) {
  dragCounter++;
  dropActive.value = true;
}
function onDragLeave(e: DragEvent) {
  dragCounter--;
  if (dragCounter <= 0) {
    dropActive.value = false;
    dragCounter = 0;
  }
}
// onFileDrop and onFileChange remain as before
const loading = ref(false);
const attachedFiles = reactive<AttachedFile[]>([]);
const messages = reactive<ChatMessage[]>([]);

function fileIconClass(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'txt': return 'file-lines'; // fa-file-alt in v5, fa-file-lines in v6
    case 'csv': return 'file-csv';
    case 'json': return 'brackets-curly'; // fa-file-code or fa-brackets-curly
    case 'md': return 'markdown'; // fa-markdown in pro, fallback to fa-file-lines
    default: return 'file';
  }
}

function onInputEnter(e: KeyboardEvent) {
  // Enter (no Ctrl/Cmd): send. Ctrl+Enter or Cmd+Enter: newline
  if (e.key === 'Enter' && !e.shiftKey && !(e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    onSend();
  }
  // Otherwise (Ctrl+Enter/Cmd+Enter), allow default (newline)
}


function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  nextTick(() => {
    if (chatWindow.value) {
      chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
    }
  });
}

watch(messages, scrollToBottom, { deep: true });

function canSend() {
  return input.value.trim() || attachedFiles.length;
}

function addMessage(msg: Omit<ChatMessage, 'id' | 'time'>) {
  messages.push({ ...msg, id: Math.random().toString(36).slice(2), time: new Date().toISOString() });
}

function onFileDrop(e: DragEvent) {
  dropActive.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  handleFiles(files);
}

function onFileChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  handleFiles(files);
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function removeFile(idx: number) {
  attachedFiles.splice(idx, 1);
}

async function handleFiles(files: File[]) {
  for (const file of files) {
    if (!['text/plain', 'text/csv', 'application/json', 'text/markdown'].includes(file.type) && !/\.(txt|csv|json|md)$/i.test(file.name)) {
      ElMessage.error('Only txt, csv, json, md files allowed');
      continue;
    }
    const content = await file.text();
    attachedFiles.push({
      id: Math.random().toString(36).slice(2),
      file,
      name: file.name,
      content,
    });
  }
}

async function onSend() {
  if (!canSend()) return;
  for (const file of attachedFiles) {
    addMessage({ role: 'user', content: file.content, type: 'file', filename: file.name });
  }
  addMessage({ role: 'user', content: input.value, type: 'text' });
  const payload = {
    messages: messages.map(m => ({ role: m.role, content: m.content, type: m.type, filename: m.filename })),
  };
  loading.value = true;
  let aiMsgId = Math.random().toString(36).slice(2);
  let aiMsg: ChatMessage = { id: aiMsgId, role: 'assistant', content: '', time: new Date().toISOString(), type: 'text' };
  messages.push(aiMsg);
  try {
    // Streaming with fetch (SSE-style JSON lines)
    const res = await fetch(props.url + '?stream=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.body) throw new Error('No response body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;
    let finished = false;
    while (!done && !finished) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split(/\r?\n/);
        // Keep the last line in buffer if it's incomplete
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;
          let data;
          try {
            data = JSON.parse(jsonStr);
          } catch (e) {
            continue; // skip malformed lines
          }
          if (data.type === 'connection_established') {
            // Optionally handle connection established
            continue;
          }
          if (data.type === 'chunk') {
            if (data.content) {
              aiMsg.content += data.content;
              // Force Vue reactivity for live updates
              const idx = messages.findIndex(m => m.id === aiMsg.id);
              if (idx !== -1) messages[idx] = { ...aiMsg };
              scrollToBottom();
            }
            // If finish_reason is stop, mark as finished
            if (data.chunk?.choices?.[0]?.finish_reason === 'stop') {
              finished = true;
              break;
            }
          } else if (data.type === 'done') {
            finished = true;
            break;
          }
        }
      }
    }
    loading.value = false;
  } catch (err) {
    // Fallback to HTTP
    try {
      const res = await fetch(props.url + '?stream=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      aiMsg.content = data.content || '[No response]';
    } catch (err) {
      aiMsg.content = '[Error: failed to fetch AI response]';
    }
    loading.value = false;
  }
  input.value = '';
  attachedFiles.splice(0);
  nextTick(() => inputRef.value?.focus());
}
</script>

<style scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--body-bg, #fff);
  border-radius: var(--border-radius, 18px);
  box-shadow: var(--box-shadow, 0 4px 32px 0 rgba(0,0,0,0.07));
  border: 1.5px solid var(--border-color, #e3e7ee);
  overflow: hidden;
  padding: 0;
  position: relative;
  min-height: 400px;
  font-family: var(--font-family, inherit);
}


.chat-window {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2vw;
  background: linear-gradient(180deg, #f9f9fb 70%, #f3f6fa 100%);
  min-height: 320px;
  max-height: 60vh;
  transition: background 0.2s;
  width: 100%;
}

.input-row {
  display: flex;
  padding: 1.1em 1.5vw 1.1em 1.5vw;
  background: #fff;
  border-top: 1px solid #e6eaf0;
  width: 100%;
  box-sizing: border-box;
  align-items: flex-end;
  justify-content: center;
}

.input-group {
  display: flex;
  align-items: flex-end;
  width: 100%;
  position: relative;
}

.ai-textarea .el-textarea__inner {
  width: 100%;
  min-height: 44px !important;
  border-radius: var(--border-radius, 16px) !important;
  border: 1.5px solid var(--border-color, #e3e7ee) !important;
  background: var(--inputs-bg-color, #f7fafd) !important;
  box-shadow: none !important;
  font-size: 1em;
  color: var(--text-color, #222);
  padding: 0.8em 1.2em 0.8em 1.2em;
  resize: none;
  transition: box-shadow 0.18s, border 0.18s, background 0.18s, min-height 0.18s;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}
.ai-textarea .el-textarea__inner:focus {
  background: var(--inputs-bg-color, #f0f7ff) !important;
  box-shadow: 0 2px 16px 0 var(--focus-color, rgba(64,158,255,0.10)) !important;
  border: 1.5px solid var(--focus-color, #409eff) !important;
  outline: none !important;
}


.ai-send-btn {
  position: absolute;
  right: 0.55em;
  bottom: 0.55em;
  z-index: 2;
  border-radius: var(--button-radius, 50%);
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--box-shadow, 0 2px 12px 0 rgba(64,158,255,0.11));
  background: var(--button-bg-color, linear-gradient(135deg, #409eff 65%, #6ebfff 100%));
  color: var(--button-text-color, #fff);
  border: none;
  transition: box-shadow var(--transition-speed, 0.18s), background var(--transition-speed, 0.18s), transform 0.12s;
  font-size: 1.3em;
  cursor: pointer;
}
.ai-send-btn:active {
  transform: scale(0.93);
}
.ai-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ai-send-btn:hover:not(:disabled),
.ai-send-btn:focus:not(:disabled) {
  background: var(--focus-color, linear-gradient(135deg, #156fd1 60%, #6ebfff 100%));
  box-shadow: 0 4px 18px 0 var(--focus-color, rgba(64,158,255,0.18));
}
.send-icon {
  width: 26px;
  height: 26px;
  display: block;
  transition: transform var(--transition-speed, 0.18s);
}
.ai-send-btn:hover .send-icon {
  transform: translateX(2px) scale(1.06);
}

.bubble {
  margin-bottom: 1.1rem;
  padding: 0.85rem 1.2rem;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 1px 8px 0 rgba(0,0,0,0.05);
  max-width: 85%;
  transition: box-shadow 0.2s, background 0.2s;
  animation: pop-in 0.2s;
}
.bubble.user {
  align-self: flex-end;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.bubble.assistant {
  align-self: flex-start;
  background: #fff;
}
.bubble-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
}
.avatar {
  font-size: 1.25em;
  margin-right: 0.5em;
}
.meta {
  font-size: 0.85em;
  color: #999;
}
.bubble-content {
  white-space: pre-wrap;
  word-break: break-word;
}
.stream-indicator {
  display: flex;
  align-items: center;
  color: var(--el-color-primary);
  font-size: 0.95em;
  margin-top: 1em;
}
.stream-indicator .spin {
  margin-right: 0.5em;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  100% { transform: rotate(360deg); }
}
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.drag-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(64, 158, 255, 0.12);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  font-size: 1.25em;
  pointer-events: none;
  transition: background 0.2s;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.ai-chat {
  position: relative;
}
.input-row {
  display: flex;
  gap: 0.5em;
  padding: 1em;
  background: var(--body-bg, #fff);
  border-top: 1px solid var(--border-color, #eee);
}
.input-group {
  display: flex;
  align-items: flex-end;
  width: 100%;
  position: relative;
}

.attached-files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  margin-bottom: 0.25em;
}
.file-chip {
  display: flex;
  align-items: center;
  gap: 0.3em;
  background: #f3f6fa;
  color: #555;
  border-radius: 6px;
  padding: 0.2em 0.7em;
  font-size: 0.92em;
}

.chat-window {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  background: #f9f9fb;
  min-height: 320px;
  max-height: 50vh;
  transition: background 0.2s;
  position: relative;
}
.ai-initial-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #888;
  background: rgba(255,255,255,0.7);
  border-radius: 14px;
  margin: 2.5em auto 1.5em auto;
  padding: 2.2em 1.5em 1.7em 1.5em;
  max-width: 90%;
  box-shadow: 0 2px 14px 0 rgba(64,158,255,0.07);
}
.ai-initial-title {
  font-size: 1.15em;
  font-weight: 600;
  margin-bottom: 0.5em;
}
.ai-initial-desc {
  font-size: 1em;
  color: #666;
  margin-top: 0.2em;
  line-height: 1.7;
}

.bubble {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 4px 0 rgba(0,0,0,0.02);
  max-width: 80%;
  transition: box-shadow 0.2s, background 0.2s;
  animation: pop-in 0.2s;
}
.bubble.user {
  align-self: flex-end;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.bubble.assistant {
  align-self: flex-start;
  background: #fff;
}
.bubble-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
}
.avatar {
  font-size: 1.25em;
  margin-right: 0.5em;
}
.meta {
  font-size: 0.85em;
  color: #999;
}
.bubble-content {
  white-space: pre-wrap;
  word-break: break-word;
}
.stream-indicator {
  display: flex;
  align-items: center;
  color: var(--el-color-primary);
  font-size: 0.95em;
  margin-top: 1em;
}
.stream-indicator .spin {
  margin-right: 0.5em;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  100% { transform: rotate(360deg); }
}
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.input-row {
  display: flex;
  gap: 0.5em;
  padding: 1em;
  background: var(--body-bg, #fff);
  border-top: 1px solid var(--border-color, #eee);
}
</style>