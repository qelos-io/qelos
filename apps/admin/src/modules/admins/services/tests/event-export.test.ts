import { createEventsExport, eventToExportRecord } from '../event-export';
import type { IEvent } from '../../../../services/apis/events-service';

const baseEvent: IEvent = {
  _id: 'event-1',
  tenant: 'tenant-1',
  user: 'user-1',
  workspace: 'workspace-1',
  source: 'blueprints',
  kind: 'entity',
  eventName: 'update',
  description: 'Updated record',
  metadata: { entity: 'entity-1', changed: ['name'] },
  created: '2026-05-07T10:00:00.000Z',
};

describe('event export', () => {
  test('normalizes an event for export', () => {
    expect(eventToExportRecord(baseEvent)).toEqual({
      created: '2026-05-07T10:00:00.000Z',
      kind: 'entity',
      eventName: 'update',
      source: 'blueprints',
      user: 'user-1',
      workspace: 'workspace-1',
      description: 'Updated record',
      metadata: '{"entity":"entity-1","changed":["name"]}',
    });
  });

  test('exports events as json', () => {
    const file = createEventsExport([baseEvent], 'json');

    expect(file.extension).toBe('json');
    expect(file.mimeType).toBe('application/json;charset=utf-8');
    expect(JSON.parse(file.content)).toEqual([eventToExportRecord(baseEvent)]);
  });

  test('exports events as escaped csv', () => {
    const file = createEventsExport([
      {
        ...baseEvent,
        description: 'Updated "quoted", record',
      },
    ], 'csv');

    expect(file.extension).toBe('csv');
    expect(file.content).toContain('created,kind,eventName,source,user,workspace,description,metadata');
    expect(file.content).toContain('"Updated ""quoted"", record"');
  });
});
