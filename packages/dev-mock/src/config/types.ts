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

export interface MockPersonaSeed extends MockUserSeed {}

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
