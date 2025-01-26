// Type of pool metadata single entry's value
export type MetadataMap = {
  pid: number;
  sessionPoolCount: number;
  sessionPoolManager: SessionPoolManager;
};

// Type of session pool metrics
export type PoolMetricsType = {
  Id: number;
  CPU: number;
  Memory: number;
  SessionPoolCount: number;
};
