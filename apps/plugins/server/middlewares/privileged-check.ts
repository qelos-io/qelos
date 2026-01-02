import { ResponseError } from '@qelos/api-kit';

export function onlyViewPrivileged(req, res, next) {
  if (req.user?.roles?.includes('admin') || req.user?.roles?.includes('editor') || req.user?.roles?.includes('viewer')) {
    next();
    return;
  }
  next(new ResponseError('only privileged user can perform this action', 403));
}

export function onlyEditPrivileged(req, res, next) {
  if (req.user?.roles?.includes('admin') || req.user?.roles?.includes('editor')) {
    next();
    return;
  }
  next(new ResponseError('only privileged user can perform this action', 403));
}

export function checkEditPrivileged(req, res, next) {
  req.isPrivileged = req.user?.roles?.includes('admin') || req.user?.roles?.includes('editor');
  next();
}

export function onlyEditPrivilegedOrPlugin(req, res, next) {
  if (req.user?.roles?.includes('admin') || req.user?.roles?.includes('editor') || req.isPlugin) {
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
