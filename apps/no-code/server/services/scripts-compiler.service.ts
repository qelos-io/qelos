import path from 'node:path';
import crypto from 'node:crypto';

export const SCRIPTS_URL_PREFIX = '/api/static/scripts/';

/** Placeholder specifier prefix used for Vue components, resolved at runtime by the compiled wrapper. */
export const SCRIPT_EXTERNAL_PREFIX = 'qelos-script:';

/** Libraries the host app already provides as globals (same set as the component compiler). */
export const GLOBAL_LIBRARIES: Record<string, string> = {
  vue: 'Vue',
  'vue-router': 'VueRouter',
  'element-plus': 'ElementPlus',
  'vue-i18n': 'VueI18n',
  '@sdk': 'QelosSDK',
};

const SCRIPT_EXT_REGEX = /\.(m?[jt]sx?)$/;
const IDENTIFIER_REGEX = /^[\w@.-]+(\/[\w@.-]+)*$/;

export function normalizeScriptIdentifier(identifier: string): string {
  return String(identifier || '').trim().replace(/^(\.\/)+/, '').replace(SCRIPT_EXT_REGEX, '');
}

export function isValidScriptIdentifier(identifier: string): boolean {
  return IDENTIFIER_REGEX.test(identifier) && !identifier.split('/').some(part => part === '.' || part === '..');
}

/**
 * Resolves a relative import specifier (`./utils/demo.ts`) to a script identifier (`utils/demo`).
 * @param fromIdentifier identifier of the importing script, or '' for a component (which lives at the root)
 * @returns the identifier, or null if the specifier escapes the root
 */
export function resolveScriptSpecifier(specifier: string, fromIdentifier = ''): string | null {
  // `@/utils/demo.ts` and `/utils/demo.ts` are root aliases: they ignore the importing file's folder
  const fromRoot = /^(@\/|\/)/.test(specifier);
  const resolved = fromRoot
    ? path.posix.normalize(specifier.replace(/^(@\/|\/)+/, ''))
    : path.posix.join(path.posix.dirname(fromIdentifier || 'x'), specifier);
  if (resolved.startsWith('..') || resolved.startsWith('/')) return null;
  const identifier = resolved.replace(SCRIPT_EXT_REGEX, '');
  return isValidScriptIdentifier(identifier) ? identifier : null;
}

/** True for specifiers that point at a script: relative (`./x`, `../x`) or from the root (`@/x`, `/x`). */
export const isScriptSpecifier = (specifier: string) => /^(\.{1,2}\/|@\/|\/)/.test(specifier);

/**
 * Identifiers a specifier may mean, best first. A `./x` import is relative to the importing file's folder, and falls back
 * to the root (`./products/x` from inside `products/` still finds `products/x`).
 */
export function scriptSpecifierCandidates(specifier: string, fromIdentifier = ''): string[] {
  const candidates = [resolveScriptSpecifier(specifier, fromIdentifier)];
  if (specifier.startsWith('./')) candidates.push(resolveScriptSpecifier(`@/${specifier.slice(2)}`));
  return [...new Set(candidates.filter((id): id is string => !!id))];
}

export function scriptUrl(identifier: string): string {
  return `${SCRIPTS_URL_PREFIX}${identifier}.js`;
}

/** Stable, identifier-safe global name for a script, used to bridge ES imports into a UMD component. */
export function scriptGlobalName(identifier: string): string {
  return 'qs_' + crypto.createHash('sha1').update(identifier).digest('hex').substring(0, 12);
}

const GLOBAL_MODULE_PREFIX = '\0qelos-global:';

/** Collects the named bindings imported from a global library, so the shim module can re-export them. */
function namedImportsFrom(content: string, library: string): string[] {
  const names = new Set<string>();
  const regex = new RegExp(`import\\s*(?:[\\w$]+\\s*,\\s*)?\\{([^}]*)\\}\\s*from\\s*['"]${library.replace(/[/@-]/g, '\\$&')}['"]`, 'g');
  for (const match of content.matchAll(regex)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (/^[\w$]+$/.test(name) && name !== 'default') names.add(name);
    }
  }
  return [...names];
}

// vite is ESM-only, so it is loaded lazily
const scriptsPlugin = (identifier: string, content: string) => {
  const entryId = `/qelos-script/${identifier}.ts`;
  return {
    name: 'qelos-scripts',
    enforce: 'pre' as const,
    resolveId(source) {
      if (source === entryId) return entryId;
      if (isScriptSpecifier(source)) {
        const target = resolveScriptSpecifier(source, identifier);
        if (!target) throw new Error(`Invalid import "${source}"`);
        return { id: scriptUrl(target), external: true };
      }
      if (GLOBAL_LIBRARIES[source]) return GLOBAL_MODULE_PREFIX + source;
      throw new Error(`Cannot import "${source}". Only relative script imports and ${Object.keys(GLOBAL_LIBRARIES).join(', ')} are supported`);
    },
    load(id) {
      if (id === entryId) return content;
      if (id.startsWith(GLOBAL_MODULE_PREFIX)) {
        const library = id.slice(GLOBAL_MODULE_PREFIX.length);
        const global = `window[${JSON.stringify(GLOBAL_LIBRARIES[library])}]`;
        const named = namedImportsFrom(content, library).map(name => `export const ${name} = ${global}[${JSON.stringify(name)}];`);
        return [`export default ${global};`, ...named].join('\n');
      }
    },
  };
};

/**
 * Compiles a TS/JS source file into a minified browser ES module, using the vite already installed for components.
 * Relative imports to other scripts are rewritten to their served URLs.
 */
export async function compileScript(content: string, identifier: string): Promise<{ js: string }> {
  const entryId = `/qelos-script/${identifier}.ts`;
  const { build } = await import('vite');
  const result: any = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [scriptsPlugin(identifier, content)],
    build: {
      write: false,
      minify: true,
      target: 'es2020',
      copyPublicDir: false,
      lib: { entry: entryId, formats: ['es'], fileName: 'script' },
    },
  });
  const output = (Array.isArray(result) ? result[0] : result).output;
  return { js: output.find((chunk: any) => chunk.type === 'chunk').code };
}
