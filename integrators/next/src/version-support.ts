/**
 * Declared Next.js compatibility policy for `@qelos/integrator-next`.
 * Keep in sync with `peerDependencies.next` in package.json and README.
 */
export const MIN_NEXT_VERSION = '13.4.0';

/** Latest major we type-check and unit-test against (see devDependencies.next). */
export const TESTED_NEXT_MAJOR = 15;

/** Forward-compatible peer range — no upper bound so future majors stay supported. */
export const NEXT_PEER_RANGE = '>=13.4.0';
