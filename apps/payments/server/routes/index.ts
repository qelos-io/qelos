import plansRouter from './plans';
import subscriptionsRouter from './subscriptions';
import invoicesRouter from './invoices';
import couponsRouter from './coupons';

const app = require('@qelos/api-kit').app();

app.use(plansRouter);
app.use(subscriptionsRouter);
app.use(invoicesRouter);
app.use(couponsRouter);
