import { populateUser } from '@qelos/api-kit';
import { privilegedRoles } from '../../config';

export default function populateUserMiddleware(req, res, next) {
  populateUser(req, res, () => {
    if (req.user) {
      req.user.isPrivileged = req.user.roles?.some(role => privilegedRoles.includes(role));
    }
    next();
  });
}
