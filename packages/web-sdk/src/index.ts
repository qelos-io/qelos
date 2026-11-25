import loadStyles from './shared-style.js';
import {getCode, authorize, unAuthorize} from './auth.js';

export const code = getCode();

export {
  authorize,
  unAuthorize
}

export { QelosChatWidget } from './chat-widget.js';
export type { QelosChatWidgetOptions } from './chat-widget.js';

loadStyles();