import PlatformEvent from '../models/event';
import {emitPlatformEvent} from '../services/hook-events';
import logger from '../services/logger';

const LIMIT = 50;

export async function getAllEvents(req, res) {
  const {page = 0} = req.query;
  const skip = Number(page * LIMIT);

  const events = await PlatformEvent
    .find({
      tenant: req.headers.tenant,
    })
    .select('-metadata')
    .sort('-created')
    .skip(isNaN(skip) ? 0 : skip)
    .limit(LIMIT)
    .lean();
  res.json(events).end();
}

export async function getEvent(req, res) {
  const event = await PlatformEvent.findOne({
    tenant: req.headers.tenant,
    _id: req.params.eventId
  }).lean().exec()
  res.json(event).end();
}

export async function createEvent(req, res) {
  res.status(200).end();

  try {
    const event = new PlatformEvent(req.body);
    if (req.user && req.user.roles.includes('plugin')) {
      event.source = 'plugin:' + event.source;
    }
    event.tenant = req.headers.tenant;
    await event.save();
    emitPlatformEvent(event);
  } catch (err) {
    logger.log('something is wrong', err)
    //
  }

}
