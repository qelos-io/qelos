import PlatformEvent from '../models/event';
import {emitPlatformEvent} from '../services/hook-events';
import logger from '../services/logger';
import { cacheManager } from '../services/cache-manager';

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

export async function getEventsCount(req, res) {
  const {page = 0, kind = '*', eventName = '*', source = '*', user, workspace, period = 'last-week', 'no-cache': noCache} = req.query;

  const cacheKey = `events:count:${req.headers.tenant}:${JSON.stringify({kind, eventName, source, user, workspace, period})}`;
  
  if (noCache !== 'true') {
    try {
      const cachedResult = await cacheManager.getItem(cacheKey);
      if (cachedResult) {
        return res.set('content-type', 'application/json').send(cachedResult).end();
      }
    } catch (err) {
      // Cache error, continue with database query
    }
  }

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

  const count = await PlatformEvent.countDocuments(dbQuery);
  const result = { count };
  
  // Cache for 5 minutes (300 seconds)
  if (noCache !== 'true') {
    cacheManager.setItem(cacheKey, JSON.stringify(result), { ttl: 300 }).catch();
  }
  
  res.json(result).end();
}

export async function getEventsSum(req, res) {
  const { sum, groupBy, kind = '*', eventName = '*', source = '*', user, workspace, period = 'last-week', 'no-cache': noCache} = req.query;

  if (!sum) {
    res.status(400).json({ message: 'sum property is required' }).end();
    return;
  }

  const cacheKey = `events:sum:${req.headers.tenant}:${JSON.stringify({sum, groupBy, kind, eventName, source, user, workspace, period})}`;
  
  if (noCache !== 'true') {
    try {
      const cachedResult = await cacheManager.getItem(cacheKey);
      if (cachedResult) {
        return res.json(JSON.parse(cachedResult)).end();
      }
    } catch (err) {
      // Cache error, continue with database query
    }
  }

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

  // If no groupBy provided, return just the total sum
  if (!groupBy) {
    const result = await PlatformEvent.aggregate([
      { $match: dbQuery },
      { $group: { _id: null, sum: { $sum: `$metadata.${sum}` } } }
    ]).exec();
    
    const totalSum = result.length > 0 ? result[0].sum : 0;
    const response = { sum: totalSum };
    
    // Cache for 5 minutes (300 seconds)
    if (noCache !== 'true') {
      cacheManager.setItem(cacheKey, JSON.stringify(response), { ttl: 300 }).catch();
    }
    
    return res.json(response).end();
  }

  // Group by logic
  let $group;
  if (groupBy === 'day') {
    $group = {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$created" } },
      sum: { $sum: `$metadata.${sum}` }
    }
  } else if (groupBy === 'month') {
    $group = {
      _id: { $dateToString: { format: "%Y-%m", date: "$created" } },
      sum: { $sum: `$metadata.${sum}` }
    }
  } else if (groupBy === 'year') {
    $group = {
      _id: { $dateToString: { format: "%Y", date: "$created" } },
      sum: { $sum: `$metadata.${sum}` }
    }
  } else if (groupBy === 'eventName') {
    $group = {
      _id: '$eventName',
      sum: { $sum: `$metadata.${sum}` }
    }
  } else if (groupBy === 'source') {
    $group = {
      _id: '$source',
      sum: { $sum: `$metadata.${sum}` }
    }
  } else if (groupBy === 'kind') {
    $group = {
      _id: '$kind',
      sum: { $sum: `$metadata.${sum}` }
    }
  } else {
    // Default to metadata field grouping
    $group = {
      _id: `$metadata.${groupBy}`,
      sum: { $sum: `$metadata.${sum}` }
    }
  }
  
  const data = await PlatformEvent.aggregate([
    { $match: dbQuery },
    { $group },
    { $sort: { _id: 1 } }
  ]).exec();
  
  const response = {
    groups: data.map(d => ({
      group: d._id,
      sum: d.sum
    })),
    sum: data.reduce((acc, d) => acc + d.sum, 0)
  };
  
  // Cache for 5 minutes (300 seconds)
  if (noCache !== 'true') {
    cacheManager.setItem(cacheKey, JSON.stringify(response), { ttl: 300 }).catch();
  }
  
  res.json(response).end();
}
