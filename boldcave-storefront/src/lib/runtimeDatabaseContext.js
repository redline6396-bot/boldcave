import { AsyncLocalStorage } from "node:async_hooks";

const runtimeDatabaseStorage = new AsyncLocalStorage();

export function getRuntimeDatabaseContext() {
  return runtimeDatabaseStorage.getStore() || null;
}

export function runWithRuntimeDatabaseContext(context, operation) {
  return runtimeDatabaseStorage.run(context, operation);
}
