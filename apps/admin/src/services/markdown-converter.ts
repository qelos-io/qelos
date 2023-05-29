import {Remarkable} from 'remarkable';

const remarkable  = new Remarkable({html: true, breaks: true});

export function toHTML(md: string) {
  return remarkable.render(md)
}