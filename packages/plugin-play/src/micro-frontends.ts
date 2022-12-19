import manifest, {NavBarGroup} from './manifest';
import {addProxyEndpoint, QelosRouteParams} from './endpoints';

export interface IframeMicroFrontend extends GlobalMicroFrontend {
  url: string;
}

export interface PreDesignedMicroFrontendOptions
  extends Pick<QelosRouteParams, 'verifyToken'>,
    Partial<Pick<QelosRouteParams, 'handler'>>,
    GlobalMicroFrontend {
  use: string;
  fetchUrl?: string;
}

interface PreDesignedMicroFrontend extends Omit<PreDesignedMicroFrontendOptions, 'handler' | 'verifyToken'> {
  fetchUrl: string;
}

export interface GlobalMicroFrontend {
  name: string;
  description: string;
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

export type MicroFrontendOptions = IframeMicroFrontend | PreDesignedMicroFrontendOptions
export type MicroFrontend = IframeMicroFrontend | PreDesignedMicroFrontend

export function addMicroFrontend(mfe: MicroFrontendOptions) {
  mfe = {...mfe}
  let manifestMfe: MicroFrontend;
  if ('use' in mfe) {
    const verifyToken = mfe.verifyToken || true;
    delete mfe.verifyToken;

    if ('handler' in mfe) {
      const fetchUrl = mfe.fetchUrl || btoa(mfe.name);
      const handler = mfe.handler;
      delete mfe.handler;
      addProxyEndpoint(fetchUrl, {
        handler,
        verifyToken,
      });
      manifestMfe = {
        ...mfe as PreDesignedMicroFrontend,
        fetchUrl
      }
    } else if ('fetchUrl' in mfe) {
      manifestMfe = mfe as PreDesignedMicroFrontend;
    }
  } else {
    manifestMfe = mfe;
  }
  manifest.microFrontends.push(manifestMfe);
}

export function addGroupedMicroFrontends(group: NavBarGroup, mfeArray: MicroFrontendOptions[]) {
  manifest.navBarGroups.push(group);
  mfeArray.forEach(mfe => {
    addMicroFrontend({...mfe, route: {...mfe.route, group: group.key}})
  })
}
