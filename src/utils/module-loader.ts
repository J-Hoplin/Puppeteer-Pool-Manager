const moduleCache = new Map<string, Promise<any>>();

export async function lazyImportModule<T = any>(
  moduleName: string,
): Promise<T> {
  if (!moduleCache.has(moduleName)) {
    const loader = new Function('moduleName', 'return import(moduleName);') as (
      name: string,
    ) => Promise<T>;
    moduleCache.set(
      moduleName,
      loader(moduleName).catch((error) => {
        moduleCache.delete(moduleName);
        throw new Error(
          `Failed to load module "${moduleName}". Install it before enabling this queue provider. Original error: ${error instanceof Error ? error.message : error}`,
        );
      }),
    );
  }
  return moduleCache.get(moduleName) as Promise<T>;
}
