import manifest, {NavBarGroup} from './manifest';

export interface MicroFrontend {
  name: string;
  description: string;
  url: string;
  route?: {
    name: string;
    path: string;
    roles?: string[],
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
    size: 'sm' | 'md' | 'xl' | 'full'
  }
}

export {start, configure, registerToHook} from './app';
export {onRefreshToken, onManifest, onStoreUser, onNewTenant, onCallback} from './handlers';
export {addEndpoint, addProxyEndpoint} from './endpoints'
export {getSdkForTenant, getSdk, getSdkForUrl} from './sdk';

export function addMicroFrontend(mfe: MicroFrontend) {
  manifest.microFrontends.push(mfe);
}

export function addGroupedMicroFrontends(group: NavBarGroup, mfeArray: MicroFrontend[]) {
  manifest.navBarGroups.push(group);
  mfeArray.forEach(mfe => {
    addMicroFrontend({...mfe, route: {...mfe.route, group: group.key}})
  })
}
