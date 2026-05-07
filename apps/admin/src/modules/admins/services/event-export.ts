import type { IEvent } from '../../../services/apis/events-service';

export type EventsExportFormat = 'csv' | 'json';

export interface EventsExportFile {
  content: string;
  extension: EventsExportFormat;
  mimeType: string;
}

const CSV_COLUMNS = [
  'created',
  'kind',
  'eventName',
  'source',
  'user',
  'workspace',
  'description',
  'metadata',
] as const;

export function getEventUserId(event: IEvent) {
  if (!event.user) {
    return '';
  }

  return typeof event.user === 'string' ? event.user : event.user._id || event.user.email || '';
}

export function getEventWorkspaceId(event: IEvent) {
  if (event.workspace) {
    return typeof event.workspace === 'string' ? event.workspace : event.workspace._id || '';
  }

  const metadata = event.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return '';
  }

  const workspace = metadata.workspace || metadata.workspaceId;
  if (!workspace) {
    return '';
  }

  return typeof workspace === 'string' ? workspace : workspace._id || '';
}

export function getEventMetadataText(event: IEvent) {
  return event.metadata === undefined || event.metadata === null
    ? ''
    : JSON.stringify(event.metadata);
}

export function eventToExportRecord(event: IEvent) {
  return {
    created: event.created ? new Date(event.created).toISOString() : '',
    kind: event.kind || '',
    eventName: event.eventName || '',
    source: event.source || '',
    user: getEventUserId(event),
    workspace: getEventWorkspaceId(event),
    description: event.description || '',
    metadata: getEventMetadataText(event),
  };
}

export function createEventsExport(events: IEvent[], format: EventsExportFormat): EventsExportFile {
  const records = events.map(eventToExportRecord);

  if (format === 'json') {
    return {
      content: JSON.stringify(records, null, 2),
      extension: 'json',
      mimeType: 'application/json;charset=utf-8',
    };
  }

  const rows = [
    CSV_COLUMNS.join(','),
    ...records.map((record) => CSV_COLUMNS.map((column) => escapeCsvValue(record[column])).join(',')),
  ];

  return {
    content: rows.join('\n'),
    extension: 'csv',
    mimeType: 'text/csv;charset=utf-8',
  };
}

function escapeCsvValue(value: string) {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
