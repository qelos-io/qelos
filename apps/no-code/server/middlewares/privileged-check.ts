import {privilegedEditingRoles, privilegedViewingRoles} from '../../config';

export function checkAllPrivileges(req, res, next) {
  if (req.user.roles.find(role => privilegedViewingRoles.includes(role))) {
    req.user.hasViewingPrivileges = true
  }

  if (req.user.roles.find(role => privilegedEditingRoles.includes(role))) {
    req.user.isPrivileged = true
  }

  return next()
}

export function onlyViewPrivileged(req, res, next) {
  if (req.user.hasViewingPrivileges || req.user.roles.find(role => privilegedViewingRoles.includes(role))) {
    req.user.hasViewingPrivileges = true
    return next()
  }

  return res.status(401).end()
}

export function onlyEditPrivileged(req, res, next) {
  if (req.user.isPrivileged || req.user.roles.find(role => privilegedEditingRoles.includes(role))) {
    req.user.isPrivileged = true
    return next()
  }

  return res.status(401).end()
}