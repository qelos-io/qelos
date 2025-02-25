export interface WorkspaceLabelDefinition {
  title: string,
  description: string,
  value: string[],
  allowedRolesForCreation?: string[],
}

export interface WorkspaceConfigurationMetadata {
  isActive: boolean,
  creationPrivilegedRoles: string[],
  viewMembersPrivilegedWsRoles: string[],
  labels: WorkspaceLabelDefinition[],
  allowNonLabeledWorkspaces: true,
  allowLogo?: boolean,
  createWorkspacePageTitle?: string,
  labelsSelectorTitle?: string,

}