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
