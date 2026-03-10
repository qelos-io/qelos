import { getRouter } from '@qelos/api-kit';
import populateUser from '../middleware/populate-user';
import { onlyAuthenticated } from '../middleware/auth-check';
import { getInvoices, getInvoice } from '../controllers/invoices';

const router = getRouter();

router
  .get('/api/invoices', populateUser, onlyAuthenticated, getInvoices)
  .get('/api/invoices/:id', populateUser, onlyAuthenticated, getInvoice);

export default router;
