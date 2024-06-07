export interface IMicroFrontend {
  name: string;
  description: string;
  url: string;
  active: boolean;
  opened: boolean;
  roles: string[],
  workspaceRoles: string[],
  crud?: string;
  use?: string;
  structure?: string;
  searchQuery?: boolean,
  searchPlaceholder?: string,
  navigateAfterSubmit?: {
    name: string,
    params: Record<string, string>,
    query: Record<string, string>,
  },
  clearAfterSubmit?: boolean,
  route?: {
    name: string;
    path: string;
    roles: string[],
    navBarPosition: 'top' | 'bottom' | 'user-dropdown' | false;
    group?: string;
  };
  component?: {
    page: string;
    position: 'top' | 'left' | 'right' | 'bottom';
  };
  modal?: {
    name: string;
    params: string[] | Record<string, string>; // schema / hints for props
    size: 'sm' | 'md' | 'lg' | 'full'
  }
}