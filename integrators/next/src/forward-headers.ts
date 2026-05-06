import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { QELOS_USER_HEADER, QELOS_WORKSPACE_HEADER } from './types';

/**
 * Replace forwarded identity headers on the outbound request: strip any
 * client-supplied values first, then attach ids resolved by the integrator.
 */
export function applyQelosForwardHeaders(
  forwardedHeaders: Headers,
  user: IUser | null,
  workspace: IWorkspace | null
): void {
  forwardedHeaders.delete(QELOS_USER_HEADER);
  forwardedHeaders.delete(QELOS_WORKSPACE_HEADER);
  if (user) {
    forwardedHeaders.set(
      QELOS_USER_HEADER,
      String((user as { _id?: unknown })._id ?? '')
    );
  }
  if (workspace) {
    forwardedHeaders.set(
      QELOS_WORKSPACE_HEADER,
      String((workspace as { _id?: unknown })._id ?? '')
    );
  }
}
