import {Response} from 'express'
import {AuthRequest} from '../../types'
import logger from "../services/logger";

import Workspace, { Invite } from "../models/workspace";
import { emitPlatformEvent } from "@qelos/api-kit";
import UserInternalMetadata from "../models/user-internal-metadata";

export async function getInvites(req: AuthRequest, res: Response) {
  const { email } = req.userPayload;
  const { tenant } = req.headers;

  try {
    const invites = await Workspace.find({
      tenant,
      "invites.email": email,
    })
      .select("_id name logo")
      .lean()
      .exec();

    res.send(invites);
  } catch (error) {
    logger.log("failed to get invites", error);
    res.status(500).json({ message: "failed to retrieve invites list" }).end();
  }
}

export async function respondToInvite(req: AuthRequest, res: Response) {
  const { workspace: workspaceId, kind = "decline" } = req.body;
  const { email } = req.userPayload;
  const { tenant } = req.headers;

  if (!workspaceId) {
    logger.log("missing required prams: workspace-id");
    return res.status(400).json({ message: "missing workspace-id" });
  }

  if (!["accept", "decline"].includes(kind)) {
    return res
      .status(400)
      .json({ message: 'respond kind should be either "accept" or "decline"' });
  }

  try {
    const workspace = await Workspace.findOne({
      tenant,
      _id: workspaceId,
      "invites.email": email,
    });
    if (!workspace) {
      return res
        .status(404)
        .json({ message: "workspace not found", email, workspaceId });
    }

    const filteredInvites = workspace.invites.filter(
      (invite) => invite.email != email
    );
    workspace.invites = filteredInvites as Invite[];

    if (kind === "accept") {
      const member = {
        user: req.userPayload.sub,
        created: new Date(),
        roles: ["user"],
      };

      workspace.members.push(member);
    }

    await workspace.save();
    emitPlatformEvent({
      tenant: tenant,
      source: "auth",
      kind: "invites",
      eventName: "invite responded",
      description: "invition was responded by the reciever",
      metadata: workspace,
      created: new Date(),
    });
  } catch (error) {
    logger.log("failed to respond to invite", error);
    res.status(500).json({ success: false }).end();
  }

  res.status(200).json({ sucess: true });
}
