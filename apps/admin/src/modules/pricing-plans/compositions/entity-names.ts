import { reactive } from 'vue';
import type { BillableEntityType } from '@qelos/global-types';
import workspacesService from '@/services/apis/workspaces-service';
import usersService from '@/services/apis/users-service';

const key = (type: BillableEntityType, id: string) => `${type}:${id}`;

const names = reactive<Record<string, string>>({});
const pending = new Set<string>();
let workspacesLoaded: Promise<void> | null = null;

function loadWorkspaces() {
  workspacesLoaded ||= (workspacesService.getOne('all') as unknown as Promise<{ _id: string; name: string }[]>)
    .then((list) => {
      for (const workspace of list || []) {
        names[key('workspace', workspace._id)] = workspace.name;
      }
    })
    .catch(() => undefined);
  return workspacesLoaded;
}

function displayName(user: any) {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return full || user.username || user.email || '';
}

/** Resolves human names for billable accounts (workspaces in one request, users on demand), cached across views. */
export function useEntityNames() {
  async function resolve(entities: { type: BillableEntityType; id: string }[]) {
    if (entities.some((entity) => entity.type === 'workspace')) {
      await loadWorkspaces();
    }
    await Promise.all(
      entities
        .filter((entity) => entity.type === 'user' && !names[key('user', entity.id)] && !pending.has(key('user', entity.id)))
        .map(async (entity) => {
          pending.add(key('user', entity.id));
          try {
            names[key('user', entity.id)] = displayName(await usersService.getOne(entity.id));
          } catch {
            // an unknown user simply keeps showing its id
          } finally {
            pending.delete(key('user', entity.id));
          }
        }),
    );
  }

  const nameOf = (type: BillableEntityType, id: string) => names[key(type, id)] || id;

  return { resolve, nameOf };
}
