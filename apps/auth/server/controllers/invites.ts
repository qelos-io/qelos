import {Response} from 'express'
import {AuthRequest} from '../../types'

export function getInvites(req: AuthRequest, res: Response) {
  res.send([]);
}

export async function respondToInvite(req: AuthRequest, res: Response) {
  const {workspace, kind = 'decline'} = req.body;
  const {email} = req.userPayload;

  // now, act to invite response with given variables...
  const member = {user: req.userPayload.sub, created: new Date(), roles: ['user']};

  res.status(500).json({message: 'failed to respond to invite'});
}
