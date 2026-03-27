export function getMessagesWithUserContext(messages: any[], unsafeUserContext: Record<string, string>) {
  const firstUserMessageIndex = messages.findIndex((msg) => msg.role === 'user');
  if (firstUserMessageIndex > -1) {
    messages = [
      ...messages.slice(0, firstUserMessageIndex),
      { role: 'user', content: `Context given by user to this chat: ${JSON.stringify(unsafeUserContext)}` },
      ...messages.slice(firstUserMessageIndex),
    ];
  }
  return messages;
}

export function compactObject<T extends Record<string, any>>(obj: T): T {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    ) {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as T);
}

export function safeJsonParse(value: any, fallback?: any) {
  if (typeof value !== 'string') {
    return value ?? fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback ?? value;
  }
}

export function extractTextContent(content: any) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text))
      .filter(Boolean)
      .join('\n');
  }

  if (content && typeof content === 'object') {
    return JSON.stringify(content);
  }

  return '';
}
