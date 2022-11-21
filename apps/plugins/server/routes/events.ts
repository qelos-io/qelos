import {getRouter, verifyUser, populateUser} from '@qelos/api-kit';
import {onlyEditPrivileged, onlyEditPrivilegedOrPlugin} from '../middlewares/privileged-check';
import {createEvent, getAllEvents, getEvent} from '../controllers/events';

const eventsRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, onlyEditPrivileged]

eventsRouter
  .get('/api/events', AUTHENTICATION_MIDDLEWARES.concat(getAllEvents))
  .post('/api/events', [populateUser, verifyUser, onlyEditPrivilegedOrPlugin, createEvent])

eventsRouter.post('/internal-api/events', createEvent);

eventsRouter.get('/api/events/:eventId', AUTHENTICATION_MIDDLEWARES.concat(getEvent));

export default eventsRouter;
