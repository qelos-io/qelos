import Workspace from '../models/workspace';

export function getWorkspaceForUser(tenant: string, userId: string, workspaceId: string) {
  const query: any = {
    tenant,
    'members.user': userId
  };
  if (workspaceId) {
    query._id = workspaceId;
  }
  return Workspace
    .findOne(query)
    .select('name members.$')
    .exec()
    .then(({ _id, name, members }) => ({
      _id,
      name,
      roles: members[0].roles
    }))
}