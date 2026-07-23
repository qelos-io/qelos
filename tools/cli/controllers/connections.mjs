import { initializeSdk } from '../services/config/sdk.mjs';
import { logger, green, red, yellow } from '../services/utils/logger.mjs';

const STATUS_COLORS = {
  connected: green,
  failed: red,
  unsupported: yellow,
};

export function colorizeStatus(status) {
  const colorize = STATUS_COLORS[status] || ((text) => text);
  return colorize(status);
}

export async function resolveStatus(sdk, source) {
  try {
    const result = await sdk.integrationSources.checkStatus(source._id);
    return result?.status || 'unknown';
  } catch (error) {
    return `error: ${error.response?.data?.message || error.message}`;
  }
}

export function printTable(rows) {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'NAME' },
    { key: 'kind', label: 'KIND' },
    { key: 'status', label: 'STATUS' },
  ];

  const widths = columns.map(({ key, label }) =>
    Math.max(label.length, ...rows.map((row) => String(row[key]).length))
  );

  const formatPlainRow = (cells) => cells.map((cell, i) => String(cell).padEnd(widths[i])).join('  ');

  console.log(formatPlainRow(columns.map((column) => column.label)));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));

  const statusColumnIndex = columns.findIndex((column) => column.key === 'status');

  for (const row of rows) {
    const cells = columns.map((column, i) => String(row[column.key]).padEnd(widths[i]));
    const padding = ' '.repeat(Math.max(0, widths[statusColumnIndex] - row.status.length));
    cells[statusColumnIndex] = colorizeStatus(row.status) + padding;
    console.log(cells.join('  '));
  }
}

export async function connectionsStatusController() {
  try {
    const sdk = await initializeSdk();
    logger.section('Connections status');

    const sources = await sdk.integrationSources.getList();

    if (!sources || sources.length === 0) {
      logger.warning('No connections found');
      return;
    }

    const statuses = await Promise.all(sources.map((source) => resolveStatus(sdk, source)));

    const rows = sources.map((source, i) => ({
      id: source._id,
      name: source.name || '(unnamed)',
      kind: source.kind,
      status: statuses[i],
    }));

    printTable(rows);

    const connectedCount = statuses.filter((status) => status === 'connected').length;
    console.log(`\n${connectedCount}/${sources.length} connected`);
  } catch (error) {
    logger.error('Failed to fetch connections status', error);
    process.exit(1);
  }
}
