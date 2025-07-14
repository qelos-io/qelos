import PlatformEvent from '../models/event';
import {emitPlatformEvent} from '../services/hook-events';
import logger from '../services/logger';

const LIMIT = 50;

export async function getAllEvents(req, res) {
  const {page = 0, kind = '*', eventName = '*', source = '*', user, workspace, period = 'last-week'} = req.query;
  const skip = Number(page * LIMIT);

  const dbQuery: any = {
    tenant: req.headers.tenant,
  }

  if (kind !== '*') {
    dbQuery.kind = kind;
  }

  if (eventName !== '*') {
    dbQuery.eventName = eventName;
  }

  if (source !== '*') {
    dbQuery.source = source;
  }

  if (user) {
    dbQuery.user = user;
  }

  if (workspace) {
    dbQuery.workspace = workspace;
  }

  if (period !== 'all-time') {
    if (period === 'last-week') {
      dbQuery.created = {
        $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
      }
    }
  
    if (period === 'last-month') {
      dbQuery.created = {
        $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      }
    }
  
    if (period === 'last-year') {
      dbQuery.created = {
        $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      }
    }

    if (period === 'last-day') {
      dbQuery.created = {
        $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
      }
    }
  }

  const events = await PlatformEvent
    .find(dbQuery)
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
    if (req.user && req.user.roles.includes('plugin') && !event.source.startsWith('plugin:')) {
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
