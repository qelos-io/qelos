import {privilegedEditingRoles, privilegedViewingRoles} from '../../config';

export function onlyViewPrivileged(req, res, next) {
  if (req.user.roles.find(role => privilegedViewingRoles.includes(role))) {
    req.user.hasViewingPrivileges = true
    return next()
  }

  return res.status(401).end()
}


export function checkEditPrivileged(req, res, next) {
  if (req.user?.roles.find(role => privilegedEditingRoles.includes(role))) {
    req.user.isPrivileged = true
    req.user.hasPluginPrivileges = true
    next()
    return;
  }

  next();
}

export function onlyEditPrivileged(req, res, next) {
  if (req.user.roles.find(role => privilegedEditingRoles.includes(role))) {
    req.user.isPrivileged = true
    req.user.hasPluginPrivileges = true
    return next()
  }

  return res.status(401).end()
}

const pluginOrPrivileged = [...privilegedEditingRoles, 'plugin'];

export function onlyEditPrivilegedOrPlugin(req, res, next) {
  if (req.user.roles.find(role => pluginOrPrivileged.includes(role))) {
    req.user.hasPluginPrivileges = true
    return next()
  }

  return res.status(401).end()
}