import PlatformEvent from '../models/event';
import {emitPlatformEvent} from '../services/hook-events';
import logger from '../services/logger';
import { cacheManager } from '../services/cache-manager';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const TOTAL_CAP = 10000;
const FILTER_OPTIONS_LIMIT = 200;

function buildDateFilter(period, from, to) {
  if (from || to) {
    const created = {};
    if (from) created.$gte = new Date(from);
    if (to) created.$lte = new Date(to);
    return Object.keys(created).length ? { created } : null;
  }
  if (period === 'all-time') return null;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (period === 'last-day') return { created: { $gte: new Date(now - day) } };
  if (period === 'last-week') return { created: { $gte: new Date(now - 7 * day) } };
  if (period === 'last-month') return { created: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) } };
  if (period === 'last-year') return { created: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } };
  return { created: { $gte: new Date(now - 7 * day) } };
}

function buildEventsQuery(tenant, { kind = '*', eventName = '*', source = '*', user, workspace, period = 'last-week', from, to }) {
  const dbQuery = { tenant };
  if (kind !== '*') dbQuery.kind = kind;
  if (eventName !== '*') dbQuery.eventName = eventName;
  if (source !== '*') dbQuery.source = source;
  if (user) dbQuery.user = user;
  if (workspace) dbQuery.workspace = workspace;
  const dateFilter = buildDateFilter(period, from, to);
  if (dateFilter) Object.assign(dbQuery, dateFilter);
  return dbQuery;
}

function parseLimit(limitParam) {
  const n = Math.max(1, Math.min(MAX_LIMIT, Number(limitParam) || DEFAULT_LIMIT));
  return Number.isFinite(n) ? n : DEFAULT_LIMIT;
}

export async function getAllEvents(req, res) {
  const { page = 0, limit: limitParam, kind = '*', eventName = '*', source = '*', user, workspace, period = 'last-week', from, to } = req.query;
  const limit = parseLimit(limitParam);
  const skip = Math.max(0, Number(page) * limit);
  const dbQuery = buildEventsQuery(req.headers.tenant, { kind, eventName, source, user, workspace, period, from, to });

  // Two indexed queries: page slice + capped “how many match” probe (at most TOTAL_CAP+1 _id reads).
  const [events, countProbe] = await Promise.all([
    PlatformEvent.find(dbQuery)
      .sort({ created: -1 })
      .skip(skip)
      .limit(limit)
      .select({ metadata: 0 })
      .lean()
      .exec(),
    PlatformEvent.find(dbQuery)
      .sort({ created: -1 })
      .limit(TOTAL_CAP + 1)
      .select('_id')
      .lean()
      .exec(),
  ]);

  const rawCount = countProbe.length;
  const totalCapped = rawCount > TOTAL_CAP;
  const total = totalCapped ? TOTAL_CAP : rawCount;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  res.json({
    events,
    total,
    totalCapped: totalCapped || undefined,
    page: Number(page) || 0,
    limit,
    totalPages,
  }).end();
}

export async function getFilterOptions(req, res) {
  const { kind = '*', eventName = '*', source = '*', period = 'last-week', from, to } = req.query;
  const dbQuery = buildEventsQuery(req.headers.tenant, { kind, eventName, source, period, from, to });

  const facetBranch = (field) => [
    { $group: { _id: `$${field}` } },
    { $match: { _id: { $nin: [null, ''] } } },
    { $sort: { _id: 1 } },
    { $limit: FILTER_OPTIONS_LIMIT },
  ];

  const [result] = await PlatformEvent.aggregate([
    { $match: dbQuery },
    {
      $facet: {
        kinds: facetBranch('kind'),
        eventNames: facetBranch('eventName'),
        sources: facetBranch('source'),
      },
    },
  ]);

  res.json({
    kinds: (result.kinds || []).map((r) => r._id).filter(Boolean),
    eventNames: (result.eventNames || []).map((r) => r._id).filter(Boolean),
    sources: (result.sources || []).map((r) => r._id).filter(Boolean),
  }).end();
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
  const { kind = '*', eventName = '*', source = '*', user, workspace, period = 'last-week', from, to, 'no-cache': noCache } = req.query;

  const cacheKey = `events:count:${req.headers.tenant}:${JSON.stringify({ kind, eventName, source, user, workspace, period, from, to })}`;

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

  const dbQuery = buildEventsQuery(req.headers.tenant, { kind, eventName, source, user, workspace, period, from, to });
  const count = await PlatformEvent.countDocuments(dbQuery);
  const result = { count };

  if (noCache !== 'true') {
    cacheManager.setItem(cacheKey, JSON.stringify(result), { ttl: 300 }).catch();
  }

  res.json(result).end();
}

export async function getEventsSum(req, res) {
  const { sum, groupBy, kind = '*', eventName = '*', source = '*', user, workspace, period = 'last-week', from, to, 'no-cache': noCache } = req.query;

  if (!sum) {
    res.status(400).json({ message: 'sum property is required' }).end();
    return;
  }

  const cacheKey = `events:sum:${req.headers.tenant}:${JSON.stringify({ sum, groupBy, kind, eventName, source, user, workspace, period, from, to })}`;

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

  const dbQuery = buildEventsQuery(req.headers.tenant, { kind, eventName, source, user, workspace, period, from, to });

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
