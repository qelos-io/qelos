import { ResponseError } from '@qelos/api-kit';
import { privilegedEditingRoles, privilegedViewingRoles } from '../../config';

export function onlyViewPrivileged(req, res, next) {
  if (req.user?.roles?.some(role => privilegedViewingRoles.includes(role))) {
    next();
    return;
  }
  next(new ResponseError('only privileged user can perform this action', 403));
}

export function onlyEditPrivileged(req, res, next) {
  if (req.user?.roles?.some(role => privilegedEditingRoles.includes(role))) {
    next();
    return;
  }
  next(new ResponseError('only privileged user can perform this action', 403));
}

export function checkEditPrivileged(req, res, next) {
  req.user.isPrivileged = req.user?.roles?.some(role => privilegedEditingRoles.includes(role));
  next();
}

export function onlyEditPrivilegedOrPlugin(req, res, next) {
  req.user.hasPluginPrivileges = req.user?.roles?.some(role => privilegedEditingRoles.includes(role)) || req.isPlugin;
  if (req.user.hasPluginPrivileges) {
    next();
    return;
  }
  next(new ResponseError('only privileged user can perform this action', 403));
}

export function onlyAdminPrivileged(req, res, next) {
    if (req.user?.roles?.includes('admin')) {
      next();
      return;
    }
    next(new ResponseError('only privileged user can perform this action', 403));
  }
