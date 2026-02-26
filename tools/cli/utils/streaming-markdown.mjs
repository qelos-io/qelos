import { green, blue, yellow, red } from './colors.mjs';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const ITALIC = '\x1b[3m';
const UNDERLINE = '\x1b[4m';
const CYAN = '\x1b[36m';

class StreamingMarkdownRenderer {
  constructor() {
    this.buffer = '';
    this.inBold = false;
    this.inItalic = false;
    this.inCode = false;
    this.inCodeBlock = false;
    this.codeBlockLang = '';
    this.lineBuffer = '';
    this.atLineStart = true;
  }

  process(chunk) {
    let output = '';
    
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      const nextChar = chunk[i + 1];
      const nextNextChar = chunk[i + 2];
      
      // Handle code blocks
      if (this.atLineStart && char === '`' && nextChar === '`' && nextNextChar === '`') {
        if (this.inCodeBlock) {
          // End code block
          output += DIM + '─'.repeat(40) + RESET + '\n';
          this.inCodeBlock = false;
          this.codeBlockLang = '';
          i += 2;
        } else {
          // Start code block
          this.inCodeBlock = true;
          i += 2;
          // Look ahead for language
          let lang = '';
          let j = i + 1;
          while (j < chunk.length && chunk[j] !== '\n') {
            lang += chunk[j];
            j++;
          }
          this.codeBlockLang = lang.trim();
          output += DIM + `${this.codeBlockLang || 'code'}:` + RESET + '\n';
          i = j - 1;
        }
        continue;
      }
      
      if (this.inCodeBlock) {
        output += char;
        if (char === '\n') {
          this.atLineStart = true;
        } else {
          this.atLineStart = false;
        }
        continue;
      }
      
      // Handle inline code
      if (char === '`' && !this.inBold && !this.inItalic) {
        if (this.inCode) {
          output += RESET;
          this.inCode = false;
        } else {
          output += CYAN;
          this.inCode = true;
        }
        continue;
      }
      
      // Handle bold (**)
      if (char === '*' && nextChar === '*' && !this.inCode && !this.inItalic) {
        if (this.inBold) {
          output += RESET;
          this.inBold = false;
          i += 1;
        } else {
          output += BOLD;
          this.inBold = true;
          i += 1;
        }
        continue;
      }
      
      // Handle italic (*)
      if (char === '*' && !this.inCode && !this.inBold) {
        if (this.inItalic) {
          output += RESET;
          this.inItalic = false;
        } else {
          output += ITALIC;
          this.inItalic = true;
        }
        continue;
      }
      
      // Handle headers at line start
      if (this.atLineStart && char === '#') {
        let headerLevel = 0;
        let j = i;
        while (j < chunk.length && chunk[j] === '#') {
          headerLevel++;
          j++;
        }
        if (j < chunk.length && chunk[j] === ' ') {
          // It's a header!
          output += '\n' + BOLD;
          if (headerLevel === 1) {
            output += UNDERLINE;
          }
          i = j;
          this.atLineStart = false;
          continue;
        }
      }
      
      // Handle line breaks
      if (char === '\n') {
        // Close any open formatting
        if (this.inBold || this.inItalic || this.inCode) {
          output += RESET;
        }
        output += '\n';
        this.atLineStart = true;
        continue;
      }
      
      // Regular character
      output += char;
      this.atLineStart = false;
    }
    
    return output;
  }
  
  end() {
    // Close any open formatting
    let output = '';
    if (this.inBold || this.inItalic || this.inCode) {
      output += RESET;
    }
    if (this.inCodeBlock) {
      output += '\n' + DIM + '─'.repeat(40) + RESET + '\n';
    }
    return output;
  }
}

export function createStreamingRenderer() {
  return new StreamingMarkdownRenderer();
}
