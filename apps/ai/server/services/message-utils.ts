import Handlebars from 'handlebars';
import logger from './logger';

/**
 * Renders Handlebars template in a system message content
 */
export function ingestSystemMessage(message: any, templateVariables: any) {
  if (message.role !== 'system' || !message.content || typeof message.content !== 'string') {
    return message;
  }

  try {
    const template = Handlebars.compile(message.content, { noEscape: true });
    return {
      ...message,
      content: template(templateVariables),
    };
  } catch (error) {
    logger.warn('Failed to render system message template', error);
    return message;
  }
}
