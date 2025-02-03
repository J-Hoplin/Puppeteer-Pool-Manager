import { execSync } from 'child_process';
import { poolLogger } from '../logger';
import pidusage from 'pidusage';
import os from 'os';

export class MetricsWatcher {
  private intervalId: NodeJS.Timeout;
  /**
   * Check PID
   *
   */
  constructor(private readonly pid: number) {}

  public startThresholdWatcher(
    limit: { cpu: number; memory: number },
    cbOverThreshold: () => Promise<void>,
    checkIntervalSecond: number,
  ) {
    /**
     * cpu: Should be a percentage
     * memory: Should be in MB
     */
    this.intervalId = setInterval(async () => {
      const metrics = await this.metrics();
      if (
        metrics.cpuUsage > limit.cpu ||
        metrics.memoryUsageValue > limit.memory
      ) {
        poolLogger.warn(
          `Over threshold: CPU: ${metrics.cpuUsage.toFixed(2)}% Memory: ${metrics.memoryUsageValue.toFixed(2)}MB`,
        );
        await cbOverThreshold();
      }
    }, checkIntervalSecond * 1000);
  }

  public stopThresholdWatcher() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  public async metrics() {
    const pids = Array.from(new Set(this.getPidsFromProcessRoot(this.pid)));
    const metrics = [];
    for (const pid of pids) {
      metrics.push(await this.getCPUMemoryUsage(pid));
    }
    const osMemory = os.totalmem();
    const cpuUsage = metrics.reduce((acc, metric) => acc + metric.cpu, 0);
    const memoryUsage = metrics.reduce((acc, metric) => acc + metric.memory, 0);
    return {
      memoryUsageValue: memoryUsage / 1024 / 1024,
      memoryUsagePercentage: (memoryUsage / osMemory) * 100,
      cpuUsage: cpuUsage,
    };
  }

  private async getCPUMemoryUsage(pid: number) {
    try {
      const stats = await pidusage(pid);
      const cpu = stats.cpu;
      const memory = stats.memory;
      return {
        cpu: cpu,
        memory: memory,
      };
    } catch {
      return {
        cpu: 0,
        memory: 0,
      };
    }
  }

  private getPidsFromProcessRoot(pid: number): number[] {
    const command =
      process.platform === 'win32'
        ? `wmic process where (ParentProcessId=${pid}) get ProcessId`
        : `pgrep -P ${pid}`;
    try {
      const commandResult = execSync(command, { encoding: 'utf-8' });
      const childPids = commandResult
        .trim()
        .split(/\s+/)
        .filter(Number)
        .map((pid) => parseInt(pid));

      return [
        pid,
        ...childPids.reduce((acc, childPid) => {
          return [...acc, ...this.getPidsFromProcessRoot(childPid)];
        }, [] as number[]),
      ];
    } catch {
      return [pid];
    }
  }
}
