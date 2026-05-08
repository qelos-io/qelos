// Compile-only type test for `BlueprintEntitiesRegistry` augmentation
// and the overloaded `entitiesOf` signatures. Runs as part of `tsc --noEmit`
// (type-check / build); not executed by `node --test`.

import QlBlueprints from '../blueprints';
import type { IBaseBlueprintEntity } from '../blueprints-entities';
import type QlBlueprintEntities from '../blueprints-entities';

interface TodoProperties {
  title: string;
  done: boolean;
}

interface TodoEntity extends IBaseBlueprintEntity, TodoProperties {}

declare module '../blueprints' {
  interface BlueprintEntitiesRegistry {
    todo: TodoEntity;
  }
}

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

declare const blueprints: QlBlueprints;

// 1. Registry-keyed lookup resolves to the augmented entity type.
const todos = blueprints.entitiesOf('todo');
type TodosCheck = Expect<Equal<typeof todos, QlBlueprintEntities<TodoEntity>>>;

// `find()` returns the merged entity shape from the registry.
declare const found: Awaited<ReturnType<typeof todos.find>>;
type FoundCheck = Expect<Equal<typeof found, (IBaseBlueprintEntity & TodoEntity)[]>>;

// 2. Explicit-generic fallback still compiles for unregistered keys.
interface AdHoc {
  name: string;
}
const adhoc = blueprints.entitiesOf<AdHoc>('not-in-registry');
type AdHocCheck = Expect<Equal<typeof adhoc, QlBlueprintEntities<AdHoc>>>;

// 3. Plain string key with no generic falls back to `any` (legacy behavior).
const dynamicKey: string = 'todo';
const loose = blueprints.entitiesOf(dynamicKey);
type LooseCheck = Expect<Equal<typeof loose, QlBlueprintEntities<any>>>;

// Mark generated checks as used so the file remains a valid module.
export type _Checks = [TodosCheck, FoundCheck, AdHocCheck, LooseCheck];
