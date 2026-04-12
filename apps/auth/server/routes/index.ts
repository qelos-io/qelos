import invitesRouter from './invites';
import userProfileRouter from './user-profile';
import usersRouter from './users';
import authRouter from './auth';
import workspaceRouter from './workspace';
import apiTokensRouter from './api-tokens';

const app = require('@qelos/api-kit').app();
const { errorHandler } = require('@qelos/api-kit');
app.use(require('cookie-parser')());

app.use(apiTokensRouter)
app.use(userProfileRouter)
app.use(invitesRouter)
app.use(usersRouter);
app.use(authRouter);
app.use(workspaceRouter);

app.use(errorHandler);
