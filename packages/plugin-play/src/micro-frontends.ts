import manifest, {NavBarGroup} from './manifest';

export interface MicroFrontend {
  name: string;
  description: string;
  url: string;
  roles?: string[],
  route?: {
    name: string;
    path: string;
    navBarPosition: 'top' | 'bottom';
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

export function addMicroFrontend(mfe: MicroFrontend) {
  manifest.microFrontends.push(mfe);
}

export function addGroupedMicroFrontends(group: NavBarGroup, mfeArray: MicroFrontend[]) {
  manifest.navBarGroups.push(group);
  mfeArray.forEach(mfe => {
    addMicroFrontend({...mfe, route: {...mfe.route, group: group.key}})
  })
}
