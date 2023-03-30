import loadStyles from './shared-style';
import {getCode, authorize, unAuthorize} from './auth';

export const code = getCode();

export {
  authorize,
  unAuthorize
}

loadStyles();