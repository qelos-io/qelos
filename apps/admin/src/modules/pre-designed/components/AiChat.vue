<template>
  <div
    class="ai-chat"
    :class="{ 'empty-chat': messages.length === 0 }"
    :full-screen.attr="fullScreen"
    @dragover.prevent="onDragOver"
    @drop.prevent="onFileDrop"
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
  >
    <div class="chat-window" ref="chatWindow">
      <div v-if="messages.length === 0" class="ai-initial-message">
        <slot v-if="$slots.initialMessage || $slots['initial-message']" name="initialMessage" :setInput="onSuggestionClick" :input="input" />
        <template v-else>
          <div class="ai-initial-title">
            {{ $t(title || "🤖 I'm your AI assistant") }}
          </div>
          <div class="ai-initial-desc">
            {{ $t("How can I help you?") }}<br />
            <span style="color: var(--main-color)">{{
              $t("You can also drop files anywhere in this chat.")
            }}</span>
          </div>
          <div v-if="suggestions?.length" class="ai-suggestions">
            <TransitionGroup name="suggestion-fade" tag="div" class="suggestions-container">
              <div
                v-for="(suggestion, idx) in suggestions"
                :key="idx"
                class="suggestion-item"
                :class="{ 'with-icon': (suggestion as any).icon }"
                @click="onSuggestionClick(suggestion)"
                @mouseenter="hoveredSuggestion = idx"
                @mouseleave="hoveredSuggestion = null"
              >
                <div class="suggestion-content">
                  <el-icon v-if="(suggestion as any).icon" class="suggestion-icon">
                    <font-awesome-icon :icon="['fas', (suggestion as any).icon]"/>
                  </el-icon>
                  <span class="suggestion-text">
                    {{
                      typeof suggestion === "string"
                        ? suggestion
                        : (suggestion as any).label || (suggestion as any).text
                    }}
                  </span>
                </div>
                <el-icon class="suggestion-arrow" :class="{ 'visible': hoveredSuggestion === idx }">
                  <ArrowRight v-if="$t('appDirection') === 'ltr'" />
                  <ArrowLeft v-else />
                </el-icon>
              </div>
            </TransitionGroup>
          </div>
        </template>
      </div>
      <transition-group name="chat-bubble" tag="div">
        <template v-if="$slots.message">
          <div
            v-for="(msg, idx) in messages"
            :key="msg.id"
          >
            <slot
              name="message"
              :message="msg"
              :index="idx"
              :is-streaming="loading && msg.role === 'assistant' && idx === messages.length - 1"
              :format-time="formatTime"
              :copy-message="copyMessage"
              :render-markdown="renderMarkdown"
              :file-icon-class="fileIconClass"
              :copied-message-id="copiedMessageId"
              :loading="loading"
            />
          </div>
        </template>
        <template v-else>
          <div
            v-for="(msg, idx) in messages"
            :key="msg.id"
            :class="[
              'bubble',
              msg.role,
              {
                message: true,
                streaming:
                  loading &&
                  msg.role === 'assistant' &&
                  idx === messages.length - 1,
              },
            ]"
          >
            <div class="bubble-header">
              <span class="avatar">
                <el-icon v-if="msg.role === 'user'"><UserFilled /></el-icon>
                <font-awesome-icon v-else :icon="['fas', 'robot']" />
              </span>
              <div class="meta">
                <span class="meta-text">{{ msg.role === "user" ? "You" : "AI" }} ·
                {{ formatTime(msg.time) }}</span>
                <span
                  v-if="msg.status && msg.role === 'user'"
                  class="message-status"
                  :class="msg.status"
                  aria-label="Message status"
                >
                  <font-awesome-icon :icon="['fas', msg.status === 'sent' ? 'check' : 'clock']" />
                </span>
              </div>
              <div
                class="copy-button"
                @click="copyMessage(msg)"
                v-if="msg.type === 'text'"
              >
                <el-icon v-if="copiedMessageId === msg.id"><Check /></el-icon>
                <el-icon v-else><DocumentCopy /></el-icon>
              </div>
            </div>
            <div class="bubble-content">
              <div
                v-if="msg.type === 'text'"
                v-html="renderMarkdown(msg.content)"
                ref="markdownContent"
              ></div>
              <div v-if="msg.type === 'file'" class="file-attachment-preview">
                <font-awesome-icon :icon="['fas', fileIconClass(msg.filename)]" />
                <span>{{ msg.filename }}</span>
              </div>
            </div>
          </div>
        </template>
      </transition-group>
      <div v-if="loading" class="stream-indicator">
        <div class="typing-pill">
          <el-icon class="spin"><Loading /></el-icon>
          <span class="typing-text">{{ $t(typingText || "AI is typing") }}</span>
          <span class="typing-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </div>
      </div>
    </div>
    <transition name="fade">
      <div v-if="dropActive" class="drag-overlay">
        <el-icon style="font-size: 2em"><UploadFilled /></el-icon>
        <div>{{ $t("Drop files to attach") }}</div>
      </div>
    </transition>
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      multiple
      accept=".txt,.csv,.json,.md"
      @change="onFileChange"
      style="display: none"
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
    <slot
      v-if="$slots['user-input']"
      name="user-input"
      :send="send"
      :input="input"
      :update-input="(value: string) => input = value"
      :loading="loading"
      :can-send="canSend()"
      :attached-files="attachedFiles"
      :remove-file="removeFile"
      :input-ref="inputRef"
      :on-input-enter="onInputEnter"
    />
    <form v-else class="input-row" @submit.prevent="send">
      <div class="input-group">
        <div class="input-rail">
          <button type="button" class="rail-btn" :disabled="loading" @click="openFilePicker" :title="$t('Attach files')">
            <font-awesome-icon :icon="['fas', 'paperclip']" />
          </button>
          <button type="button" class="rail-btn" :disabled="loading" @click="insertTemplatePrompt" :title="$t('Insert template prompt')">
            <font-awesome-icon :icon="['fas', 'lightbulb']" />
          </button>
          <button type="button" class="rail-btn" :disabled="loading" @click="insertSlashCommand" :title="$t('Slash command')">
            /
          </button>
        </div>
        <el-input
          v-model="input"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 6 }"
          :placeholder="$t('How can we help you today?')"
          size="large"
          :disabled="loading"
          ref="inputRef"
          autocomplete="off"
          aria-label="Message input"
          @keydown.enter="onInputEnter"
          class="ai-textarea"
          style="flex: 1; min-width: 0"
        />
        <button
          class="ai-send-btn"
          :disabled="!canSend || loading || !input.trim()"
          type="submit"
          aria-label="Send">
          <el-icon><icon-arrow-up /></el-icon>
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  reactive,
  nextTick,
  watch,
  computed,
  onMounted,
} from "vue";
import { ElMessage } from "element-plus";
import {
  UploadFilled,
  Document,
  Loading,
  UserFilled,
  DocumentCopy,
  Check,
  ArrowRight,
  ArrowLeft,
} from "@element-plus/icons-vue";
import { Remarkable } from "remarkable";
import threadsService from "@/services/apis/threads-service";
import { linkify } from "remarkable/linkify";
import { isAdmin, isLoadingDataAsUser } from "@/modules/core/store/auth";

const props = defineProps<{
  url: string;
  title?: string;
  text?: string;
  chatContext?: Record<string, string | number | boolean | undefined>;
  recordThread?: boolean;
  threadId?: string;
  integrationId?: string;
  suggestions?: Array<string | { label: string; text?: string; icon?: string }>;
  fullScreen?: boolean;
  typingText?: string;
  manager?: boolean;
}>();

const emit = defineEmits([
  "thread-created",
  "thread-updated",
  "message-sent",
  "message-received",
  "function-executed",
  "update:threadId",
  "mounted"
]);

const localThreadId = ref(props.threadId);

const templatePromptPool = computed(() => {
  const prompts: string[] = [];
  if (props.chatContext?.currentPage) {
    prompts.push(
      `Review and enhance the layout of ${props.chatContext.currentPage}.`
    );
  }
  prompts.push(
    "Summarize the last AI response into actionable steps.",
    "Suggest the next best action for our current workflow."
  );
  return prompts;
});

const shouldRecordThread = computed(() => props.recordThread || props.threadId);

const chatCompletionUrl = computed(() => {
  if (shouldRecordThread.value) {
    const threadId = props.threadId || localThreadId.value;
    return props.url.includes("[threadId]")
      ? props.url.replace("[threadId]", threadId)
      : props.url.includes(threadId)
      ? props.url
      : props.url + "/" + threadId;
  }
  return props.url;
});

function getIntegrationIdFromUrl() {
  return props.url?.split("/api/ai/")[1]?.split("/")[0] || undefined;
}

async function createThread() {
  const newThread = await threadsService.create({
    integration: props.integrationId || getIntegrationIdFromUrl(),
  });

  emit("update:threadId", newThread._id);
  localThreadId.value = newThread._id;

  return newThread;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  type: "text" | "file";
  filename?: string;
  status?: "sending" | "sent";
}

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  content: string;
}

const input = ref("");
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
const copiedMessageId = ref<string | null>(null);
const hoveredSuggestion = ref<number | null>(null);

// Reference to markdown content elements
const markdownContent = ref<HTMLElement[]>([]);
const templatePromptIndex = ref(0);

// Function to add copy buttons to tables
function addTableCopyButtons() {
  nextTick(() => {
    // Handle case when markdownContent is an array (multiple refs)
    const elements = Array.isArray(markdownContent.value)
      ? markdownContent.value.filter((el) => el)
      : [markdownContent.value].filter((el) => el);

    elements.forEach((el) => {
      if (!el) return;

      // Find the message element this content belongs to
      const messageEl = el.closest(".message");
      // Only add copy buttons if this is not a currently streaming message
      const isStreaming = messageEl?.classList.contains("streaming");
      if (isStreaming) return;

      const tables = el.querySelectorAll("table");
      tables.forEach((table, index) => {
        // Skip tables that already have copy buttons
        if (table.parentElement?.classList.contains("table-wrapper")) return;

        // Create wrapper div
        const wrapper = document.createElement("div");
        wrapper.classList.add("table-wrapper");
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);

        // Create copy button
        const copyButton = document.createElement("div");
        copyButton.classList.add("table-copy-button");
        copyButton.dataset.tableId = `table-${index}`;
        copyButton.innerHTML =
          '<svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M768 832a128 128 0 0 1-128 128H192A128 128 0 0 1 64 832V384a128 128 0 0 1 128-128v64a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64h64z"></path><path fill="currentColor" d="M384 128a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64V192a64 64 0 0 0-64-64H384zm0-64h448a128 128 0 0 1 128 128v448a128 128 0 0 1-128 128H384a128 128 0 0 1-128-128V192A128 128 0 0 1 384 64z"></path></svg>';
        wrapper.appendChild(copyButton);

        // Add click event listener
        copyButton.addEventListener("click", () => {
          copyTableToClipboard(table)
            .then(() => {
              // Visual feedback
              copyButton.classList.add("copied");
              copyButton.innerHTML =
                '<svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M406.656 706.944 195.84 496.256a32 32 0 1 0-45.248 45.248l256 256 512-512a32 32 0 0 0-45.248-45.248L406.592 706.944z"></path></svg>';
              setTimeout(() => {
                copyButton.classList.remove("copied");
                copyButton.innerHTML =
                  '<svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M768 832a128 128 0 0 1-128 128H192A128 128 0 0 1 64 832V384a128 128 0 0 1 128-128v64a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64h64z"></path><path fill="currentColor" d="M384 128a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64V192a64 64 0 0 0-64-64H384zm0-64h448a128 128 0 0 1 128 128v448a128 128 0 0 1-128 128H384a128 128 0 0 1-128-128V192A128 128 0 0 1 384 64z"></path></svg>';
              }, 5000);
            })
            .catch((err) => {
              console.error("Failed to copy table:", err);
            });
        });
      });
    });
  });
}

function fileIconClass(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "txt":
      return "file-lines"; // fa-file-alt in v5, fa-file-lines in v6
    case "csv":
      return "file-csv";
    case "json":
      return "brackets-curly"; // fa-file-code or fa-brackets-curly
    case "md":
      return "markdown"; // fa-markdown in pro, fallback to fa-file-lines
    default:
      return "file";
  }
}

function onInputEnter(e: KeyboardEvent) {
  // Enter (no Ctrl/Cmd): send. Ctrl+Enter or Cmd+Enter: newline
  if (e.key === "Enter" && !e.shiftKey && !(e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    send();
  }
  // Otherwise (Ctrl+Enter/Cmd+Enter), allow default (newline)
}

// Initialize markdown renderer
const md = new Remarkable({
  html: false, // Disable HTML for security
  xhtmlOut: false,
  breaks: true, // Convert '\n' in paragraphs into <br>
  langPrefix: "language-",
  typographer: true, // Enable some language-neutral replacement + quotes beautification
});

md.use(linkify);

// Function to render markdown content
const renderMarkdown = (content: string): string => {
  return md.render(content);
};

// Function to copy table data in a format suitable for spreadsheets
function copyTableToClipboard(table: HTMLTableElement): Promise<void> {
  if (!table) return Promise.reject("No table element found");

  // Extract table data into a TSV format (tab-separated values)
  let tsvContent = "";

  // Process header row if exists
  const headerRows = table.querySelectorAll("thead tr");
  if (headerRows.length > 0) {
    headerRows.forEach((row) => {
      const headerCells = row.querySelectorAll("th");
      const headerTexts = Array.from(headerCells).map(
        (cell) => cell.textContent?.trim() || ""
      );
      tsvContent += headerTexts.join("\t") + "\n";
    });
  }

  // Process body rows
  const bodyRows = table.querySelectorAll("tbody tr");
  bodyRows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    const cellTexts = Array.from(cells).map(
      (cell) => cell.textContent?.trim() || ""
    );
    tsvContent += cellTexts.join("\t") + "\n";
  });

  // If no thead/tbody structure, process all rows directly
  if (headerRows.length === 0 && bodyRows.length === 0) {
    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      // Get all cells (th or td)
      const cells = row.querySelectorAll("th, td");
      const cellTexts = Array.from(cells).map(
        (cell) => cell.textContent?.trim() || ""
      );
      tsvContent += cellTexts.join("\t") + "\n";
    });
  }

  // Copy to clipboard
  return navigator.clipboard.writeText(tsvContent);
}

function formatTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function copyMessage(msg: ChatMessage) {
  if (msg.content) {
    navigator.clipboard
      .writeText(msg.content)
      .then(() => {
        copiedMessageId.value = msg.id;
        setTimeout(() => {
          copiedMessageId.value = null;
        }, 5000);
      })
      .catch((err) => {
        ElMessage.error("Failed to copy message");
        console.error("Failed to copy message:", err);
      });
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatWindow.value) {
      chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
    }
  });
}

// Watch for changes in messages to scroll to bottom and add table copy buttons
watch(
  messages,
  () => {
    scrollToBottom();
    // Add slight delay to ensure markdown is rendered
    setTimeout(addTableCopyButtons, 100);
  },
  { deep: true }
);

function canSend() {
  return input.value.trim() || attachedFiles.length;
}

function addMessage(msg: Omit<ChatMessage, "id" | "time">) {
  messages.push({
    ...msg,
    id: Math.random().toString(36).slice(2),
    time: new Date().toISOString(),
  });
}

function markUserMessagesAsSent() {
  messages.forEach((msg, index) => {
    if (msg.role === "user" && msg.status === "sending") {
      messages[index] = { ...msg, status: "sent" };
    }
  });
}

function onFileDrop(e: DragEvent) {
  dropActive.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  handleFiles(files);
}

function onFileChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  handleFiles(files);
  if (fileInputRef.value) fileInputRef.value.value = "";
}

function removeFile(idx: number) {
  attachedFiles.splice(idx, 1);
}

async function handleFiles(files: File[]) {
  for (const file of files) {
    if (
      !["text/plain", "text/csv", "application/json", "text/markdown"].includes(
        file.type
      ) &&
      !/\.(txt|csv|json|md)$/i.test(file.name)
    ) {
      ElMessage.error("Only txt, csv, json, md files allowed");
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

function onSuggestionClick(
  suggestion: string | { label: string; text?: string; value?: string; icon?: string }
) {
  if (typeof suggestion === "string") {
    input.value = suggestion;
  } else {
    input.value = (suggestion.text || suggestion.value || suggestion.label) + ' ';
  }
  inputRef.value?.focus();
}

function openFilePicker() {
  fileInputRef.value?.click();
}

function insertTemplatePrompt() {
  if (!templatePromptPool.value.length) return;
  const prompt =
    templatePromptPool.value[templatePromptIndex.value % templatePromptPool.value.length];
  templatePromptIndex.value += 1;
  input.value = prompt;
  inputRef.value?.focus();
}

function insertSlashCommand() {
  if (!input.value.startsWith("/")) {
    input.value = "/" + input.value.trimStart();
  }
  if (!input.value.endsWith(" ")) {
    input.value += " ";
  }
  inputRef.value?.focus();
}

async function send() {
  if (!canSend()) return;
  for (const file of attachedFiles) {
    addMessage({
      role: "user",
      content: file.content,
      type: "file",
      filename: file.name,
      status: "sending",
    });
  }
  addMessage({ role: "user", content: input.value.trim(), type: "text", status: "sending" });
  const payload = {
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      type: m.type,
      filename: m.filename,
    })),
    context: props.chatContext,
  };
  loading.value = true;
  let aiMsgId = Math.random().toString(36).slice(2);
  let aiMsg: ChatMessage = {
    id: aiMsgId,
    role: "assistant",
    content: "",
    time: new Date().toISOString(),
    type: "text",
  };
  messages.push(aiMsg);
  try {
    if (shouldRecordThread.value && !localThreadId.value) {
      await createThread();
    }
    // Streaming with fetch (SSE-style JSON lines)
    const url = new URL(chatCompletionUrl.value, window.location.origin);
    url.searchParams.append("stream", "true");
    if (isAdmin.value && isLoadingDataAsUser.value && !props.manager) {
      url.searchParams.append("bypassAdmin", "true");
    }
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.body) throw new Error("No response body");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;
    let finished = false;
    while (!done && !finished) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split(/\r?\n/);
        // Keep the last line in buffer if it's incomplete
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;
          let data;
          try {
            data = JSON.parse(jsonStr);
          } catch (e) {
            continue; // skip malformed lines
          }
          if (data.type === "connection_established") {
            // Optionally handle connection established
            continue;
          }
          if (data.type === "chunk") {
            if (data.content) {
              aiMsg.content += data.content;
              // Force Vue reactivity for live updates
              const idx = messages.findIndex((m) => m.id === aiMsg.id);
              if (idx !== -1) messages[idx] = { ...aiMsg };
              scrollToBottom();
            }
            // If finish_reason is stop, mark as finished
            if (data.chunk?.choices?.[0]?.finish_reason === "stop") {
              finished = true;
              break;
            }
          } else if (data.type === "followup_chunk") {
            // Handle followup chunks from function calling
            if (data.content) {
              aiMsg.content += data.content;
              // Force Vue reactivity for live updates
              const idx = messages.findIndex((m) => m.id === aiMsg.id);
              if (idx !== -1) messages[idx] = { ...aiMsg };
              scrollToBottom();
            }
          } else if (data.type === 'function_executed') {
            let args = {}
            try {
              args = JSON.parse(data.functionCall?.arguments || '{}');
            } catch (e) {
              // ignore
            }
            emit('function-executed',{
              name: data.functionCall?.function?.name,
              arguments: args,
            });
          } else if (data.type === "done") {
            finished = true;
            break;
          }
        }
      }
    }
    loading.value = false;
    markUserMessagesAsSent();
    // Only add table copy buttons after the assistant has finished typing
    nextTick(() => {
      setTimeout(addTableCopyButtons, 100);
    });
  } catch (err) {
    // Fallback to HTTP
    try {
      const url = new URL(props.url, window.location.origin);
      url.searchParams.append("stream", "false");
      if (isAdmin.value && isLoadingDataAsUser.value && !props.manager) {
        url.searchParams.append("bypassAdmin", "true");
      }
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      aiMsg.content = data.content || "[No response]";
    } catch (err) {
      aiMsg.content = "[Error: failed to fetch AI response]";
    }
    loading.value = false;
    markUserMessagesAsSent();
    // Only add table copy buttons after the assistant has finished typing
    nextTick(() => {
      setTimeout(addTableCopyButtons, 100);
    });
  }
  input.value = "";
  attachedFiles.splice(0);
  nextTick(() => {
    inputRef.value?.focus();
  });
}

onMounted(() => {
  if (props.text) {
    input.value = props.text;
  }
  // Initialize table copy buttons for any existing content
  setTimeout(addTableCopyButtons, 100);

  emit('mounted', {
    input,
    messages,
    threadId: localThreadId,
    chatWindow,
    inputRef,
    loading,
    chatCompletionUrl,
    createThread,
    addMessage,
    send,
    renderMarkdown,
    openFilePicker
  });
});
</script>

<style scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 249, 255, 0.92));
  border-radius: var(--border-radius, 18px);
  box-shadow: 0 12px 40px rgba(22, 34, 71, 0.08);
  border: 1px solid rgba(113, 128, 150, 0.12);
  overflow: hidden;
  padding: 0;
  position: relative;
  min-height: 400px;
  max-height: calc(100vh - var(--header-height));
  font-family: var(--font-family, inherit);
}

.ai-chat::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top, rgba(64, 158, 255, 0.18), transparent 45%);
  pointer-events: none;
  opacity: 0.6;
}

.ai-chat[full] {
  height: 100%;
}

.chat-window {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: linear-gradient(180deg, rgba(250, 251, 255, 0.6), rgba(244, 246, 252, 0.9));
  min-height: 320px;
  max-height: 100%;
  transition: background 0.2s;
  position: relative;
}

.chat-window > div {
  display: flex;
  flex-direction: column;
}


@media (max-width: 768px) {
  .ai-chat {
    height: calc(100vh - var(--header-height));
  }

  .chat-window {
    flex: 1;
    max-height: 100%;
  }
}

.empty-chat .chat-window {
  display: flex;
  flex-direction: column;
  height: calc(100% - 80px);
  position: relative;
}

.input-row {
  display: flex;
  gap: 0.5em;
  padding: 1.2em 1.5em;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(17, 24, 39, 0.08);
  transition: transform 0.3s ease, margin-top 0.3s ease;
}

.empty-chat .ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.empty-chat .input-row {
  transform: translateY(-50%);
  border-top: none;
  padding: 1.5em;
  z-index: 5;
}

.empty-chat .ai-initial-message {
  margin-top: 5%;
  margin-bottom: 0;
  z-index: 1;
}

.input-group {
  display: flex;
  align-items: flex-end;
  width: 100%;
  position: relative;
}

.ai-textarea :deep(.el-textarea__inner) {
  width: 100%;
  min-height: 44px !important;
  border-radius: var(--border-radius, 16px) !important;
  border: 1px solid rgba(113, 128, 150, 0.25) !important;
  background: var(--inputs-bg-color, #fdfefe) !important;
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

.ai-textarea :deep(.el-textarea__inner:focus) {
  background: var(--inputs-bg-color, #f4f8ff) !important;
  box-shadow: 0 6px 18px rgba(44, 104, 255, 0.08) !important;
  border: 1px solid rgba(64, 158, 255, 0.6) !important;
  outline: none !important;
}

.ai-send-btn {
  position: absolute;
  inset-inline-end: 0.55em;
  inset-block-end: 0.55em;
  z-index: 2;
  border-radius: var(--border-radius, 50%);
  margin-inline-end: 2px;
  margin-block-end: 2px;
  width: 22px;
  height: 22px;
  box-shadow: var(--box-shadow, 0 2px 2px 0 rgba(64, 158, 255, 0.11));
  background: var(
    --button-bg-color,
    linear-gradient(135deg, #409eff 65%, #6ebfff 100%)
  );
  color: var(--button-text-color, #fff);
  border: none;
  transition: box-shadow var(--transition-speed, 0.18s),
    background var(--transition-speed, 0.18s), transform 0.12s;
  font-size: 1.3em;
  cursor: pointer;
  margin-inline-start: 0.5em;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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
  background: var(
    --focus-color,
    linear-gradient(135deg, #156fd1 60%, #6ebfff 100%)
  );
  box-shadow: 0 4px 18px 0 var(--focus-color, rgba(64, 158, 255, 0.18));
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
  margin-bottom: 1rem;
  padding: 0.35rem 0.55rem 0;
  border-radius: 16px;
  background: var(--body-bg, #fff);
  box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.02);
  max-width: 80%;
  transition: box-shadow 0.2s, background 0.2s;
  animation: pop-in 0.2s;
}

.bubble.user {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.18), rgba(64, 158, 255, 0.1));
  color: #0f172a;
}

.bubble.assistant {
  align-self: flex-start;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.05);
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.35em;
}

.meta-text {
  font-size: clamp(0.78rem, 1vw, 0.9rem);
  color: #828da3;
}

.message-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.65rem;
  border: 1px solid transparent;
}

.message-status.sending {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.3);
}

.message-status.sent {
  color: #67c23a;
  border-color: rgba(103, 194, 58, 0.3);
}

.bubble-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
  position: relative;
}

.avatar {
  width: 26px;
  height: 26px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95em;
  margin-inline-end: 0.45em;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
}

.bubble.user .avatar {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.95), rgba(33, 117, 226, 0.95));
  color: #fff;
}

.bubble.assistant .avatar {
  background: linear-gradient(135deg, rgba(239, 246, 255, 1), rgba(219, 234, 254, 1));
  color: #305177;
  border: 1px solid rgba(15, 23, 42, 0.06);
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
  justify-content: center;
  margin-block-start: 1em;
}

.typing-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  padding: 0.45em 0.9em;
  border-radius: 999px;
  background: rgba(64, 158, 255, 0.08);
  color: #2b3a67;
  font-size: 0.92em;
  border: 1px solid rgba(64, 158, 255, 0.2);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.stream-indicator .spin {
  margin-inline-end: 0.1em;
  color: var(--el-color-primary);
  animation: spin 1s linear infinite;
}

.typing-dots {
  display: inline-flex;
  gap: 0.2em;
}

.typing-dots span {
  width: 0.35em;
  height: 0.35em;
  border-radius: 50%;
  background: var(--el-color-primary);
  opacity: 0.5;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
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

.ai-initial-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #888;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(242, 248, 255, 0.92));
  border-radius: 18px;
  margin: 2.5em auto 1.25em auto;
  padding: 2.4em 1.8em 2em 1.8em;
  max-width: min(640px, 92%);
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(64, 158, 255, 0.16);
  position: relative;
  overflow: hidden;
}

.ai-initial-message::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(64, 158, 255, 0.12), transparent 55%),
    radial-gradient(circle at 80% 0%, rgba(110, 191, 255, 0.2), transparent 45%);
  opacity: 0.8;
  pointer-events: none;
}

.ai-initial-message > * {
  position: relative;
  z-index: 1;
}

.ai-initial-title {
  font-size: 1.35em;
  font-weight: 600;
  margin-bottom: 0.75em;
  color: #0f172a;
}

.ai-initial-desc {
  font-size: 1.05em;
  color: #4b5563;
  margin-top: 0.2em;
  line-height: 1.8;
}

.bubble-content h1,
.bubble-content h2,
.bubble-content h3,
.bubble-content h4,
.bubble-content h5,
.bubble-content h6 {
  margin: 0.5em 0 0.3em 0;
  font-weight: 600;
  line-height: 1.3;
}

.bubble-content h1 {
  font-size: 1.4em;
}
.bubble-content h2 {
  font-size: 1.3em;
}
.bubble-content h3 {
  font-size: 1.2em;
}
.bubble-content h4 {
  font-size: 1.1em;
}
.bubble-content h5 {
  font-size: 1.05em;
}
.bubble-content h6 {
  font-size: 1em;
}

.bubble-content p {
  margin: 0.5em 0;
  line-height: 1.5;
}

.bubble-content ul,
.bubble-content ol {
  margin: 0.5em 0;
  padding-inline-start: 1.5em;
  display: flex;
  flex-direction: column;
}

.bubble-content li {
  margin: 0.2em 0;
  line-height: 1.4;
}

.bubble-content code {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 0.9em;
}

.bubble-content pre {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.8em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.bubble-content pre code {
  background: none;
  padding: 0;
}

/* Table wrapper and copy button styles */
:deep(.table-wrapper) {
  position: relative;
  margin: 1em 0;
  overflow-x: auto;
}

:deep(.table-copy-button) {
  position: absolute;
  inset-block-start: 4px;
  inset-inline-end: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 2;
}

:deep(.table-copy-button .icon) {
  width: 16px;
  height: 16px;
}

:deep(.table-copy-button:hover) {
  opacity: 1;
  background: var(--el-color-primary-light-8);
}

:deep(.table-wrapper:hover .table-copy-button) {
  opacity: 0.8;
}

:deep(.table-copy-button.copied) {
  background: var(--el-color-success-light-8);
  border-color: var(--el-color-success-light-5);
  color: var(--el-color-success);
}

/* Always show table copy button on mobile */
@media (max-width: 768px) {
  :deep(.table-copy-button) {
    opacity: 0.8;
  }
}

.bubble-content blockquote {
  border-inline-start: 3px solid var(--el-color-primary);
  margin: 0.5em 0;
  padding-inline-start: 1em;
  color: #666;
  font-style: italic;
}

.bubble-content a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.bubble-content a:hover {
  text-decoration: underline;
}

.bubble-content strong {
  font-weight: 600;
}

.copy-button {
  position: absolute;
  inset-inline-end: 0;
  inset-block-start: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
}

.copy-button:hover {
  opacity: 1;
  background: var(--el-color-primary-light-8);
}

.bubble:hover .copy-button {
  opacity: 0.8;
}

/* Always show copy button on mobile devices */
@media (max-width: 768px) {
  .copy-button {
    opacity: 0.6;
  }
}

.bubble-content em {
  font-style: italic;
}

.bubble-content hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 1em 0;
}

.bubble.user .bubble-content blockquote {
  border-inline-start-color: var(--el-color-primary);
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.ai-suggestions {
  margin-top: 2em;
  width: 100%;
}

.suggestions-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5em;
  width: 100%;
  justify-content: flex-start;
}

.suggestion-item {
  font-size: 0.85em;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2em 0.1em;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(64, 158, 255, 0.18);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  min-width: 0;
  max-width: none;
  overflow: hidden;
  position: relative;
  flex: 0 1 auto;
  font-size: 75%;
}

.suggestion-item:hover {
  background: rgba(64, 158, 255, 0.08);
  border-color: rgba(64, 158, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.suggestion-item:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.1);
}

.suggestion-content {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-icon {
  color: var(--el-color-primary);
  font-size: 0.9em;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.18), rgba(110, 191, 255, 0.22));
  box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.35);
}

.suggestion-text {
  font-size: 0.9em;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-arrow {
  margin-inline-start: 0.5em;
  color: var(--el-color-primary);
  opacity: 0;
  transform: translateX(-5px);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.suggestion-arrow.visible {
  opacity: 1;
  transform: translateX(0);
}

/* Animation for suggestions */
.suggestion-fade-enter-active,
.suggestion-fade-leave-active {
  transition: all 0.3s ease;
}

.suggestion-fade-enter-from,
.suggestion-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Staggered animation for multiple suggestions */
.suggestion-item {
  animation: suggestion-pop-in 0.4s ease forwards;
  opacity: 0;
}

@keyframes suggestion-pop-in {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Apply staggered delay to suggestions */
.suggestion-item:nth-child(1) { animation-delay: 0.1s; }
.suggestion-item:nth-child(2) { animation-delay: 0.2s; }
.suggestion-item:nth-child(3) { animation-delay: 0.3s; }
.suggestion-item:nth-child(4) { animation-delay: 0.4s; }
.suggestion-item:nth-child(5) { animation-delay: 0.5s; }
.suggestion-item:nth-child(6) { animation-delay: 0.6s; }

.empty-chat .ai-suggestions {
  margin-top: 2em;
  margin-bottom: 2.5em;
  position: relative;
  inset: auto;
  z-index: 1;
}

/* Empty chat specific styles */
.empty-chat .suggestion-item {
  background: rgba(255, 255, 255, 0.95);
}

/* Mobile-specific styles */
@media (max-width: 768px) {
  .suggestions-container {
    max-width: 100%;
    gap: 0.5em;
  }
  
  .suggestion-item {
    flex: 1 1 calc(50% - 0.75em);
    min-width: 0;
    padding: 0.5em 0.75em;
    font-size: 0.9em;
  }
  
  .empty-chat .ai-suggestions {
    margin-bottom: 2em;
  }
}
</style>
<style>
:is(main, .template-content):has(.ai-chat[full-screen]) {
  height: 100%;
} 
</style>