import { updateUser } from '../services/users'
import { Response } from 'express'
import { AuthRequest } from '../../types'

export function getMe(req: AuthRequest, res: Response) {
  const firstName = req.userPayload.firstName;
  const lastName = req.userPayload.lastName;
  const fullName = req.userPayload.fullName || req.userPayload.name || `${firstName} ${lastName}`;
  res.status(200).json({
    _id: req.userPayload.sub,
    username: req.userPayload.username,
    email: req.userPayload.email,
    name: fullName,
    firstName,
    lastName,
    fullName,
    roles: req.userPayload.roles,
    workspace: req.activeWorkspace
  }).end();
}

export async function setMe(req: AuthRequest, res: Response) {
  const { username, password, name, fullName, firstName, lastName, birthDate, metadata } = req.body || {}
  try {
    await updateUser(
      { _id: req.userPayload.sub, tenant: req.userPayload.tenant } as any,
      { password, fullName: fullName || name, firstName, lastName, birthDate, metadata },
      req.authConfig
    )
    res.status(200).json({
      _id: req.userPayload.sub,
      username: username || req.userPayload.username,
      email: req.userPayload.email,
      phone: req.userPayload.phone,
      name: name || req.userPayload.name,
      fullName: fullName || req.userPayload.fullName,
      firstName: firstName || req.userPayload.firstName,
      lastName: lastName || req.userPayload.lastName,
      birthDate: birthDate || req.userPayload.birthDate,
      roles: req.userPayload.roles
    }).end()
  } catch (e) {
    res.status(500).json({ message: 'failed to update your user information' }).end()
  }
}
