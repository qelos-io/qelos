import { initializeSdk } from '../services/config/sdk.mjs';
import { logger, red } from '../services/utils/logger.mjs';
import { FOLLOW_INTERVAL_MS, parseTime, fetchEvents, formatEvent, formatEventDetails } from '../services/log/events.mjs';

export default async function logController(argv) {
  const { id, kind, source, eventName, time, follow, json } = argv;
  try {
    if (id) {
      const sdk = await initializeSdk();
      console.log(formatEventDetails(await sdk.events.getEvent(id)));
      return;
    }
    const windowMs = parseTime(time);
    const sdk = await initializeSdk();
    const filters = { kind, source, eventName };
    const print = (event) => console.log(json ? JSON.stringify(event) : formatEvent(event));

    let to = new Date();
    let seen = new Set();
    const printNew = (events, boundary) => {
      const fresh = events.filter((event) => !seen.has(event._id));
      fresh.forEach(print);
      // Window edges are inclusive, so remember ids at the boundary to skip duplicates next round.
      seen = new Set(events.filter((event) => new Date(event.created) >= boundary).map((event) => event._id));
    };

    printNew(await fetchEvents(sdk, filters, new Date(to.getTime() - windowMs), to), to);

    if (!follow) return;

    let polling = false;
    const timer = setInterval(async () => {
      if (polling) return;
      polling = true;
      const from = to;
      const now = new Date();
      try {
        printNew(await fetchEvents(sdk, filters, from, now), now);
        to = now; // only advance after success so failed polls retry the same gap
      } catch (error) {
        console.error(red(`Failed to fetch logs: ${error.response?.data?.message || error.message}`));
      } finally {
        polling = false;
      }
    }, FOLLOW_INTERVAL_MS);

    process.on('SIGINT', () => {
      clearInterval(timer);
      process.exit(0);
    });
    await new Promise(() => {});
  } catch (error) {
    logger.error('Failed to fetch logs', error);
    process.exit(1);
  }
}
