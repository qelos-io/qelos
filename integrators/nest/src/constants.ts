export const QELOS_MODULE_OPTIONS = Symbol.for('@qelos/integrator-nest:module-options');

/** Request-scoped injection token for the per-request Qelos SDK (`request.qelos.sdk`). */
export const QELOS_SDK = Symbol.for('@qelos/integrator-nest:sdk');

/** Injection token for the mock controller (`mock.active`, `await mock.get()`). */
export const QELOS_MOCK = Symbol.for('@qelos/integrator-nest:mock');
