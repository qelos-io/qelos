import plansRouter from './plans';
import subscriptionsRouter from './subscriptions';
import invoicesRouter from './invoices';
import couponsRouter from './coupons';
import checkoutRouter from './checkout';
import configurationRouter from './configuration';

const app = require('@qelos/api-kit').app();

app.use(plansRouter);
app.use(subscriptionsRouter);
app.use(invoicesRouter);
app.use(couponsRouter);
app.use(checkoutRouter);
app.use(configurationRouter);
