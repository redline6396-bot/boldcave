import { getRuntimeDatabaseContext } from "@/lib/runtimeDatabaseContext";

function getActiveModel(name, defaultModel) {
  return getRuntimeDatabaseContext()?.models?.[name] || defaultModel;
}

export function createRuntimeModel(name, defaultModel) {
  return new Proxy(defaultModel, {
    get(target, property, receiver) {
      const model = getActiveModel(name, target);
      const value = Reflect.get(model, property, model);
      return typeof value === "function" ? value.bind(model) : value;
    },
    apply(target, thisArg, argumentsList) {
      return Reflect.apply(getActiveModel(name, target), thisArg, argumentsList);
    },
    construct(target, argumentsList) {
      return Reflect.construct(getActiveModel(name, target), argumentsList);
    },
  });
}
