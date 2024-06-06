import manifest, {NavBarGroup} from './manifest';

export interface IframeMicroFrontend extends GlobalMicroFrontend {
  url: string;
}

interface PreDesignedMicroFrontend extends GlobalMicroFrontend {
  use: string;
  crud: string;
  structure: string;
}

export enum NavBarPosition {
  TOP = 'top',
  BOTTOM = 'bottom',
  USER_DROPDOWN = 'user-dropdown',
}

export interface GlobalMicroFrontend {
  name: string;
  description: string;
  roles?: string[],
  workspaceRoles?: string[],
  searchQuery?: boolean,
  searchPlaceholder?: string,
  route?: {
    name: string;
    path: string;
    navBarPosition: NavBarPosition | false;
    group?: string;
    iconName?: string;
    iconSvg?: string;
  };
  component?: {
    page: string;
    position: 'top' | 'left' | 'right' | 'bottom';
  },
  modal?: {
    name: string;
    params: string[] | Record<string, string>; // schema / hints for props
    size: 'sm' | 'md' | 'lg' | 'full'
  }
}

export type MicroFrontendOptions = IframeMicroFrontend | PreDesignedMicroFrontend
export type MicroFrontend = IframeMicroFrontend | PreDesignedMicroFrontend

export function addMicroFrontend(mfe: MicroFrontendOptions) {
  manifest.microFrontends.push({...mfe});
}

export function addGroupedMicroFrontends(group: NavBarGroup, mfeArray: (MicroFrontendOptions | false | null | undefined)[]) {
  manifest.navBarGroups.push(group);
  mfeArray.forEach(mfe => {
    if (mfe) {
      addMicroFrontend({...mfe, route: {...mfe.route, group: group.key}})
    }
  })
}
