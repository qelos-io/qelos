import plansRouter from './plans';
import subscriptionsRouter from './subscriptions';
import invoicesRouter from './invoices';
import couponsRouter from './coupons';
import checkoutRouter from './checkout';

const app = require('@qelos/api-kit').app();
const { errorHandler } = require('@qelos/api-kit');

app.use(plansRouter);
app.use(subscriptionsRouter);
app.use(invoicesRouter);
app.use(couponsRouter);
app.use(checkoutRouter);

app.use(errorHandler);
