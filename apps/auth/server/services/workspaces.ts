import Workspace from '../models/workspace';

export async function getWorkspaceForUser(tenant: string, userId: any, workspaceId?: string) {
  const query: any = {
    tenant,
    'members.user': userId
  };
  if (workspaceId) {
    query._id = workspaceId;
  }
  const { _id, name, members, labels } = await Workspace
    .findOne(query)
    .select('name labels members.$')
    .exec();
  return ({
    _id,
    name,
    roles: members[0].roles,
    labels
  });
}