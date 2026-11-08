import type { DatabaseStore, StorageFailure } from '../data/database';
import { addActivity } from '../domain/activity';
import type { ActivityType, Database, FieldErrors } from '../domain/types';

/** Lo que necesita un servicio del exterior. Se recibe por parámetro para poder probarlo. */
export interface ServiceDependencies {
  database: DatabaseStore;
  generateId(): string;
  now(): Date;
}

/** El campo `kind` le permite a TypeScript saber qué datos tiene cada tipo de falla. */
export type ServiceFailure<K extends string> =
  | { kind: 'validation'; errors: FieldErrors<K> }
  | { kind: 'not-found' }
  | { kind: 'storage'; failure: StorageFailure };

/** true si algún campo de `next` difiere del actual. Guardar sin cambios no escribe nada. */
export function hasChanges<T extends object>(current: T, next: Partial<T>): boolean {
  const keys = Object.keys(next) as (keyof T)[];
  return keys.some((key) => !Object.is(current[key], next[key]));
}

export function withActivity(
  database: Database,
  dependencies: ServiceDependencies,
  type: ActivityType,
  message: string,
): Database {
  return {
    ...database,
    activity: addActivity(database.activity, {
      id: dependencies.generateId(),
      type,
      message,
      createdAt: dependencies.now().toISOString(),
    }),
  };
}
