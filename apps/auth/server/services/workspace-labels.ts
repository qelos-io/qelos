import type { WorkspaceConfigurationMetadata, WorkspaceLabelDefinition } from '@qelos/global-types';

/** Whether the roles may start a workspace of this type, the same rule the admin panel uses to offer it. */
function mayChoose(option: WorkspaceLabelDefinition, roles: string[]): boolean {
  const allowed = option.allowedRolesForCreation;
  return !allowed || allowed.includes('*') || allowed.some((role) => roles.includes(role));
}

const sameLabels = (option: string[], labels: string[]) =>
  option.length === labels.length && option.every((label) => labels.includes(label)) && labels.every((label) => option.includes(label));

/**
 * Whether a user who is not privileged may create a workspace with these labels.
 * When labels are required, they have to be one of the options the user's roles may choose. Otherwise any label is
 * fine, except one that only belongs to options of other roles.
 */
export function mayUseWorkspaceLabels(
  config: Pick<WorkspaceConfigurationMetadata, 'allowNonLabeledWorkspaces' | 'labels'>,
  labels: string[],
  roles: string[],
): boolean {
  const options = config.labels || [];
  const open = options.filter((option) => mayChoose(option, roles));

  if (!config.allowNonLabeledWorkspaces) {
    return open.some((option) => sameLabels(option.value || [], labels));
  }

  const openLabels = new Set(open.flatMap((option) => option.value || []));
  const reserved = new Set(
    options
      .filter((option) => !mayChoose(option, roles))
      .flatMap((option) => option.value || [])
      .filter((label) => !openLabels.has(label)),
  );
  return !labels.some((label) => reserved.has(label));
}
