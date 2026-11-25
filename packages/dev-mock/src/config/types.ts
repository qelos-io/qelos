export interface MockTenant {
  name?: string;
  appUrl?: string;
  [key: string]: unknown;
}

export interface MockUserSeed {
  _id?: string;
  email: string;
  name?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface MockWorkspaceSeed {
  _id?: string;
  name: string;
  [key: string]: unknown;
}

export interface MockPersonaWorkspaceSeed {
  /** existing workspace id */
  _id?: string;
  /** workspace name (created when missing) */
  name?: string;
  labels?: string[];
  /** roles of the persona inside this workspace */
  roles?: string[];
}

export interface MockPersonaSeed extends MockUserSeed {
  /** when omitted, any non-empty password signs the persona in */
  password?: string;
  workspaces?: MockPersonaWorkspaceSeed[];
  metadata?: Record<string, unknown>;
}

export interface MockAuthOptions {
  /** access token lifetime in ms. default 5 hours */
  accessTokenTtlMs?: number;
  /** refresh token lifetime in ms. default 30 days */
  refreshTokenTtlMs?: number;
  /** cookie token lifetime in ms. default 30 days */
  cookieTokenTtlMs?: number;
  /** create a personal workspace for every newly registered user. default false */
  personalWorkspace?: boolean;
  /** role given to newly registered users. default "user" */
  defaultRole?: string;
}

export interface MockBlueprintSeed {
  _id?: string;
  identifier: string;
  [key: string]: unknown;
}

export interface MockSeed {
  users?: MockUserSeed[];
  workspaces?: MockWorkspaceSeed[];
  personas?: MockPersonaSeed[];
  blueprints?: MockBlueprintSeed[];
  /** entities keyed by blueprint identifier */
  entities?: Record<string, Array<Record<string, unknown>>>;
  configurations?: Array<Record<string, unknown>>;
  blocks?: Array<Record<string, unknown>>;
  /** role -> permissions (supports "*" and "prefix:*"). Merged over the defaults. */
  roles?: Record<string, string[]>;
  components?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  agents?: Array<Record<string, unknown>>;
  /** canned AI replies `{ agentId?, match?, content }` - first matching entry wins */
  aiResponses?: Array<Record<string, unknown>>;
  /** seeded webhook/lambda results: `{ integrationId, method?, response, status? }` */
  lambdas?: Array<Record<string, unknown>>;
}

export interface MockQelosOptions {
  enabled?: boolean;
  /** folder holding state json (`state/*.json`) and optional dump/pull artifacts */
  dataDir?: string;
  /** defaults to true when dataDir is set */
  persist?: boolean;
  seed?: MockSeed;
  /** id or email of the auto-logged-in user */
  defaultPersona?: string;
  tenant?: MockTenant;
  /** tokens, cookies and registration behaviour */
  auth?: MockAuthOptions;
  /** allow running with NODE_ENV=production */
  allowInProduction?: boolean;
  /** debounce (ms) for persistence writes. default 50 */
  persistDebounceMs?: number;
  /** logger for the warning banner. default console.warn */
  logger?: (message: string) => void;
  /** environment used by the production guard. default process.env */
  env?: Record<string, string | undefined>;
}

export interface ResolvedMockConfig extends MockQelosOptions {
  enabled: boolean;
  persist: boolean;
  seed: MockSeed;
}
