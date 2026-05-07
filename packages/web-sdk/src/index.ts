import loadStyles from './shared-style';
import {getCode, authorize, unAuthorize} from './auth';

export const code = getCode();

export {
  authorize,
  unAuthorize
}

export { QelosChatWidget } from './chat-widget';
export type { QelosChatWidgetOptions } from './chat-widget';

loadStyles();