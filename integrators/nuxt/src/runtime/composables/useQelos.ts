// Auto-imported as `useQelos` by the @qelos/integrator-nuxt module. This file
// is bundled by Nuxt/Nitro in the consuming app, so `#imports` resolves at
// the consumer's build time.
// @ts-ignore - resolved by Nuxt
import { useState, useRequestEvent } from '#imports';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import type { QelosRequestContext } from '../../types';

// Minimal local Ref type — structurally matches `vue`'s Ref for the consumer.
// We don't take a `vue` dep at this package's `tsc` build time.
interface Ref<T> {
  value: T;
}

export interface UseQelosReturn {
  /** The authenticated user (or `null` when anonymous). Hydrated from SSR. */
  user: Ref<IUser | null>;
  /** The active workspace for the user (or `null`). Hydrated from SSR. */
  workspace: Ref<IWorkspace | null>;
  /** All workspaces the user has access to. Hydrated from SSR. */
  workspaces: Ref<IWorkspace[]>;
  /** Convenience: `true` when `user` is set. */
  isAuthenticated: Ref<boolean>;
}

function getServerContext(): QelosRequestContext | null {
  if (typeof window !== 'undefined') return null;
  try {
    const event = useRequestEvent();
    return (event && event.context && event.context.qelos) || null;
  } catch {
    return null;
  }
}

/**
 * Read the current Qelos identity (user / workspace / workspaces) on the
 * client. Values are seeded on the server by the Qelos server middleware and
 * sent to the client via Nuxt's payload. SDK calls from the browser should go
 * through your own server routes (use `defineQelosEventHandler`) rather than
 * directly, so refresh-token rotation stays server-side.
 *
 * ```vue
 * <script setup lang="ts">
 * const { user, workspace, isAuthenticated } = useQelos();
 * </script>
 * ```
 */
export function useQelos(): UseQelosReturn {
  const ctx = getServerContext();
  const user = useState<IUser | null>('qelos:user', () => ctx?.user ?? null);
  const workspace = useState<IWorkspace | null>('qelos:workspace', () => ctx?.workspace ?? null);
  const workspaces = useState<IWorkspace[]>('qelos:workspaces', () => ctx?.workspaces ?? []);
  const isAuthenticated = useState<boolean>(
    'qelos:isAuthenticated',
    () => Boolean(ctx?.user),
  );
  return { user, workspace, workspaces, isAuthenticated };
}
