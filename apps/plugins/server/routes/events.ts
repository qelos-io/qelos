import { getRouter, verifyUser, populateUser, getBodyParser } from '@qelos/api-kit';
import { onlyEditPrivileged, onlyEditPrivilegedOrPlugin } from '../middlewares/privileged-check';
import { createEvent, getAllEvents, getEvent, getEventsCount, getEventsSum } from '../controllers/events';

const eventsRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, onlyEditPrivileged]

eventsRouter
  .get('/api/events', AUTHENTICATION_MIDDLEWARES.concat(getAllEvents))
  .get('/api/events/count', AUTHENTICATION_MIDDLEWARES.concat(getEventsCount))
  .get('/api/events/sum', AUTHENTICATION_MIDDLEWARES.concat(getEventsSum))
  .post('/api/events', [getBodyParser(), populateUser, verifyUser, onlyEditPrivilegedOrPlugin, createEvent])

eventsRouter.post('/internal-api/events', getBodyParser(), createEvent);

eventsRouter.get('/api/events/:eventId', AUTHENTICATION_MIDDLEWARES.concat(getEvent));

export default eventsRouter;
