---
title: Monaco Component
editLink: true
---
# Monaco Component

## Overview

The `<monaco>` component provides a powerful code editor based on the Monaco Editor (the same editor that powers VS Code). It supports syntax highlighting, code completion, and other advanced editing features for various programming languages.

## Usage

```html
<monaco v-model="code" language="javascript"></monaco>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String | '' | The code content (use with v-model) |
| `language` | String | 'javascript' | Programming language for syntax highlighting |
| `theme` | String | 'vs' | Editor theme ('vs', 'vs-dark', 'hc-black') |
| `readOnly` | Boolean | false | Whether the editor is read-only |
| `minimap` | Boolean | true | Whether to show the minimap |
| `lineNumbers` | String | 'on' | Line number display ('on', 'off', 'relative') |
| `wordWrap` | String | 'off' | Word wrapping ('off', 'on', 'wordWrapColumn', 'bounded') |
| `fontSize` | Number | 14 | Font size in pixels |
| `tabSize` | Number | 2 | Tab size in spaces |
| `height` | String | '300px' | Height of the editor |

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `update:modelValue` | (value: string) | Emitted when the code content changes |
| `editorDidMount` | (editor: monaco.editor.IStandaloneCodeEditor) | Emitted when the editor is mounted |
| `change` | (value: string) | Emitted when the code content changes |

## Examples

### Basic Usage

```html
<monaco v-model="javascriptCode" language="javascript"></monaco>
```

### With Different Language

```html
<monaco v-model="htmlCode" language="html"></monaco>
```

### With Dark Theme

```html
<monaco v-model="code" language="typescript" theme="vs-dark"></monaco>
```

### Read-Only Mode

```html
<monaco v-model="readOnlyCode" :read-only="true" language="json"></monaco>
```

### Custom Height and Font Size

```html
<monaco 
  v-model="code" 
  language="python" 
  height="500px" 
  :font-size="16"
></monaco>
```

### Without Minimap

```html
<monaco v-model="code" :minimap="false"></monaco>
```

---

u00a9 Velocitech LTD. All rights reserved.
