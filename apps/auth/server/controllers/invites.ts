import {Response} from 'express'
import {AuthRequest} from '../../types'
import logger from '../services/logger';

import Workspace, {Invite} from '../models/workspace';
import {emitPlatformEvent} from '@qelos/api-kit';

export async function getInvites(req: AuthRequest, res: Response) {
  const {email} = req.userPayload;
  const {tenant} = req.headers;

  try {
    const invites = await Workspace.find({
      tenant,
      'invites.email': email,
    })
      .select('_id name logo')
      .lean()
      .exec();

    res.send(invites);
  } catch (error) {
    logger.log('failed to get invites', error);
    res.status(500).json({message: 'failed to retrieve invites list'}).end();
  }
}

export async function respondToInvite(req: AuthRequest, res: Response) {
  const {workspace: workspaceId, kind = 'decline'} = req.body;
  const {email} = req.userPayload;
  const {tenant} = req.headers;

  if (!workspaceId) {
    return res.status(400).json({message: 'missing workspaceId'});
  }

  if (!['accept', 'decline'].includes(kind)) {
    return res
      .status(400)
      .json({message: 'respond kind should be either "accept" or "decline"'});
  }

  try {
    const workspace = await Workspace.findOne({
      tenant,
      _id: workspaceId,
      'invites.email': email,
    });
    if (!workspace) {
      return res
        .status(404)
        .json({message: 'workspace not found', email, workspaceId, from: 'invite-respond'});
    }

    const filteredInvites = workspace.invites.filter(
      (invite) => invite.email != email
    );
    workspace.invites = filteredInvites as Invite[];

    if (kind === 'accept') {
      const member = {
        user: req.userPayload.sub,
        created: new Date(),
        roles: ['user'],
      };

      workspace.members.push(member);
    }

    await workspace.save();
    emitPlatformEvent({
      tenant: tenant,
      source: 'auth',
      kind: 'invites',
      eventName: 'invite responded',
      description: 'invitation was responded by the user',
      metadata: {
        workspace: {_id: workspaceId, name: workspace.name},
        respond: {
          userId: req.userPayload.sub,
          kind,
        },
      },
      created: new Date(),
    });
  } catch (error) {
    logger.log('failed to respond to invite', error);
    res.status(500).json({message: 'failed to respond to invite'}).end();
  }

  res.status(200).json({success: true});
}
