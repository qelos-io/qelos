import invitesRouter from './invites';
import userProfileRouter from './user-profile';
import usersRouter from './users';
import authRouter from './auth';

const app = require('@qelos/api-kit').app();
app.use(require('cookie-parser')());

app.use(userProfileRouter)
app.use(invitesRouter)
app.use(usersRouter);
app.use(authRouter);
