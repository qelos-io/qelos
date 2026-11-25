import BaseSDK from '../base-sdk.js';
import { QelosSDKOptions } from '../types.js';

export type ScriptItemType = 'script' | 'component';

/**
 * A script (js/ts module) or a Vue component. Both are compiled and served from `/api/static`.
 * Scripts can be imported from components and other scripts: `import { x } from './utils/demo.ts'`.
 */
export interface IScript {
  _id?: string;
  tenant?: string;
  type: ScriptItemType;
  /** Scripts: extension-less path, e.g. `utils/demo` for `./utils/demo.ts` */
  identifier: string;
  /** Components only */
  componentName?: string;
  /** Components only */
  requiredProps?: { prop: string; type: string }[];
  description?: string;
  content: string;
  compiledContent?: { js: string; css?: string };
  created: Date;
  updated: Date;
}

/** `type` is inferred when omitted: a `componentName` or a `.vue` identifier means a component. */
export type IScriptCreateParams = Pick<IScript, 'identifier' | 'content'> & {
  type?: ScriptItemType;
  componentName?: string;
  description?: string;
};
type IScriptUpdateParams = Partial<IScriptCreateParams>;

export interface IBulkScriptResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: { type: ScriptItemType; identifier: string; success: boolean; script?: IScript; component?: any; error?: string }[];
}

export default class QlScripts extends BaseSDK {
  private relativePath = '/api/scripts';

  constructor(options: QelosSDKOptions) {
    super(options);
  }

  getScript(id: string) {
    return this.callJsonApi<IScript>(`${this.relativePath}/${id}`);
  }

  getList(type?: ScriptItemType) {
    return this.callJsonApi<IScript[]>(`${this.relativePath}${type ? `?type=${type}` : ''}`);
  }

  remove(id: string): Promise<IScript> {
    return this.callJsonApi<IScript>(`${this.relativePath}/${id}`, { method: 'delete' });
  }

  update(id: string, changes: IScriptUpdateParams): Promise<IScript> {
    return this.callJsonApi<IScript>(`${this.relativePath}/${id}`, {
      method: 'put',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(changes),
    });
  }

  create(item: IScriptCreateParams): Promise<IScript> {
    return this.callJsonApi<IScript>(this.relativePath, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item),
    });
  }

  /** Scripts are processed before components, so components in the same batch can import them. */
  bulkCreateOrUpdate(items: IScriptCreateParams[]): Promise<IBulkScriptResponse> {
    return this.callJsonApi<IBulkScriptResponse>(`${this.relativePath}/bulk`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  }
}
