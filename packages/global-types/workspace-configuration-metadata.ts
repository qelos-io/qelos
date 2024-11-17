export interface WorkspaceLabelDefinition {
  title: string,
  description: string,
  value: string[]
}

export interface WorkspaceConfigurationMetadata {
  isActive: boolean,
  creationPrivilegedRoles: string[],
  viewMembersPrivilegedWsRoles: string[],
  labels: WorkspaceLabelDefinition[],
  allowNonLabeledWorkspaces: true
}