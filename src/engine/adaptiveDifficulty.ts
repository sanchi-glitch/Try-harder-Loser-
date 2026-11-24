import type { AdaptiveSnapshot, DeathCause, DeathCluster } from '../types/game';
import { HINT_SYSTEM_MAX_LEVEL } from '../data/hintClues';

interface DeathRecord {
  x: number;
  y: number;
  levelId: number;
  timestamp: number;
  cause: DeathCause;
}

export interface LocalTrapModifiers {
  speedMult: number;
  frequencyMult: number;
  inHotspot: boolean;
  hotspotHeat: number; // 0..1
}

const ESCALATION_MIN_LEVEL = 10;
const ESCALATION_MAX_LEVEL = 100;
const CLUSTER_RADIUS = 115;
const HOTSPOT_INFLUENCE_RADIUS = 225;
const RECENT_WINDOW_MS = 45_000;

// Safety caps so escalated traps remain intense & cruel yet physically passable
const MAX_GLOBAL_SPEED_MULT = 1.62;
const MAX_GLOBAL_FREQ_MULT = 1.78;
const MAX_LOCAL_SPEED_MULT = 1.70;
const MAX_LOCAL_FREQ_MULT = 1.88;

/**
 * TypeScript equivalent of adaptive_difficulty.gd.
 *
 * Tracks player habits and spatial/temporal "death clustering" across levels.
 * In Levels 10–100, repeated deaths clustered in the same area dynamically ramp
 * trap speed, trap firing/reset frequency, and reactive hotspot hazards.
 */
export class AdaptiveDifficultySystem {
  private totalJumps = 0;
  private recentJumpTimestamps: number[] = [];
  private totalRunTime = 0;
  private totalIdleTime = 0;
  private continuousIdleTime = 0;
  private continuousRunTime = 0;
  private deathRecords: DeathRecord[] = [];
  private levelStartTime = 0;
  private currentLevelId = 1;

  public startLevel(levelId: number): void {
    this.currentLevelId = levelId;
    this.levelStartTime = performance.now();
    this.continuousIdleTime = 0;
    this.continuousRunTime = 0;
  }

  public recordJump(): void {
    const now = performance.now();
    this.totalJumps += 1;
    this.recentJumpTimestamps.push(now);
    const cutoff = now - 12_000;
    this.recentJumpTimestamps = this.recentJumpTimestamps.filter((t) => t >= cutoff);
  }

  public updateFrame(dt: number, isMoving: boolean): void {
    if (isMoving) {
      this.totalRunTime += dt;
      this.continuousRunTime += dt;
      this.continuousIdleTime = 0;
    } else {
      this.totalIdleTime += dt;
      this.continuousIdleTime += dt;
      this.continuousRunTime = 0;
    }
  }

  public recordDeath(
    x: number,
    y: number,
    levelId: number,
    cause: DeathCause = 'spike',
  ): number {
    this.deathRecords.push({
      x,
      y,
      levelId,
      timestamp: performance.now(),
      cause,
    });
    if (this.deathRecords.length > 160) {
      this.deathRecords.shift();
    }
    return this.getClusterCount(x, y, levelId);
  }

  public isEscalationLevel(levelId: number): boolean {
    return levelId >= ESCALATION_MIN_LEVEL && levelId <= ESCALATION_MAX_LEVEL;
  }

  public getClusterCount(x: number, y: number, levelId: number): number {
    let count = 0;
    const r2 = CLUSTER_RADIUS * CLUSTER_RADIUS;
    for (const pt of this.deathRecords) {
      if (pt.levelId !== levelId) continue;
      const dx = pt.x - x;
      const dy = pt.y - y;
      if (dx * dx + dy * dy <= r2) {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Counts deaths within a specific horizontal obstacle zone on a given level
   * (optionally filtered by death cause) to unlock subtle per-obstacle hints.
   */
  public getZoneDeathCount(
    levelId: number,
    minX: number,
    maxX: number,
    causes?: DeathCause[],
  ): number {
    let count = 0;
    for (const pt of this.deathRecords) {
      if (pt.levelId !== levelId) continue;
      if (pt.x < minX || pt.x > maxX) continue;
      if (causes && causes.length > 0 && !causes.includes(pt.cause)) continue;
      count += 1;
    }
    return count;
  }

  /**
   * Computes non-overlapping spatial death clusters (centroid + density + recency)
   * for the specified level, sorted from hottest cluster to coolest.
   */
  public getDeathClusters(levelId = this.currentLevelId): DeathCluster[] {
    const now = performance.now();
    const levelDeaths = this.deathRecords.filter((d) => d.levelId === levelId);
    if (levelDeaths.length === 0) return [];

    const visited = new Array<boolean>(levelDeaths.length).fill(false);
    const clusters: DeathCluster[] = [];
    const r2 = CLUSTER_RADIUS * CLUSTER_RADIUS;

    for (let i = 0; i < levelDeaths.length; i++) {
      if (visited[i]) continue;
      visited[i] = true;

      // Single-linkage spatial cluster growth
      const members: DeathRecord[] = [levelDeaths[i]];
      const queue: DeathRecord[] = [levelDeaths[i]];

      while (queue.length > 0) {
        const cur = queue.pop()!;
        for (let j = 0; j < levelDeaths.length; j++) {
          if (visited[j]) continue;
          const dx = levelDeaths[j].x - cur.x;
          const dy = levelDeaths[j].y - cur.y;
          if (dx * dx + dy * dy <= r2) {
            visited[j] = true;
            members.push(levelDeaths[j]);
            queue.push(levelDeaths[j]);
          }
        }
      }

      let sumX = 0;
      let sumY = 0;
      let recentCount = 0;
      const causeCounts = new Map<DeathCause, number>();
      for (const m of members) {
        sumX += m.x;
        sumY += m.y;
        causeCounts.set(m.cause, (causeCounts.get(m.cause) ?? 0) + 1);
        if (now - m.timestamp <= RECENT_WINDOW_MS) {
          recentCount += 1;
        }
      }

      let dominantCause: DeathCause = members[members.length - 1].cause;
      let topCauseCount = 0;
      for (const [causeKey, cnt] of causeCounts.entries()) {
        if (cnt > topCauseCount) {
          topCauseCount = cnt;
          dominantCause = causeKey;
        }
      }

      const cx = sumX / members.length;
      const cy = sumY / members.length;
      // Normalized hotspot heat (0..1), boosted by rapid recent deaths in the same spot
      const effectiveCount = members.length + recentCount * 0.4;
      const intensity = Math.min(1, Math.max(0, (effectiveCount - 1) / 6));

      clusters.push({
        x: cx,
        y: cy,
        count: members.length,
        recentCount,
        radius: CLUSTER_RADIUS,
        intensity,
        dominantCause,
      });
    }

    clusters.sort((a, b) => b.count - a.count || b.recentCount - a.recentCount);
    return clusters;
  }

  public getContinuousIdleSeconds(): number {
    return this.continuousIdleTime;
  }

  public getTimeInLevelSeconds(): number {
    return Math.max(0, (performance.now() - this.levelStartTime) / 1000);
  }

  /**
   * Computes localized speed & frequency multipliers for a trap at (x, y).
   * In Levels 1–9, returns neutral 1.0x multipliers.
   * In Levels 10–30, blends level-wide death-clustering escalation with an extra
   * proximity surge if the trap sits near a player death cluster hotspot.
   */
  public getLocalTrapModifiers(x: number, y: number, levelId = this.currentLevelId): LocalTrapModifiers {
    if (!this.isEscalationLevel(levelId)) {
      return {
        speedMult: 1,
        frequencyMult: 1,
        inHotspot: false,
        hotspotHeat: 0,
      };
    }

    const snap = this.getSnapshot(levelId);
    let hotspotHeat = 0;
    let inHotspot = false;

    for (const cluster of snap.deathClusters) {
      if (cluster.count < 2) continue;
      const dist = Math.hypot(x - cluster.x, y - cluster.y);
      if (dist <= HOTSPOT_INFLUENCE_RADIUS) {
        const proximity = 1 - dist / HOTSPOT_INFLUENCE_RADIUS;
        const heat = cluster.intensity * (0.45 + 0.55 * proximity);
        if (heat > hotspotHeat) {
          hotspotHeat = heat;
          inHotspot = true;
        }
      }
    }

    // Traps inside a death cluster hotspot surge slightly faster than distant traps
    const localSpeedBoost = inHotspot ? hotspotHeat * 0.14 : 0;
    const localFreqBoost = inHotspot ? hotspotHeat * 0.18 : 0;

    return {
      speedMult: Math.min(MAX_LOCAL_SPEED_MULT, snap.trapSpeedMultiplier + localSpeedBoost),
      frequencyMult: Math.min(MAX_LOCAL_FREQ_MULT, snap.trapFrequencyMultiplier + localFreqBoost),
      inHotspot,
      hotspotHeat,
    };
  }

  public getSnapshot(levelId = this.currentLevelId): AdaptiveSnapshot {
    const now = performance.now();
    const recentJumps = this.recentJumpTimestamps.filter((t) => t >= now - 10_000).length;
    const jumpSpamDetected =
      recentJumps >= 7 ||
      (this.totalJumps >= 18 &&
        this.totalRunTime > 4 &&
        this.totalJumps / Math.max(1, this.totalRunTime) > 1.15);

    const activeTime = this.totalRunTime + this.totalIdleTime;
    const runRatio = activeTime > 3 ? this.totalRunTime / activeTime : 0;
    const rusherDetected = this.continuousRunTime > 3.5 || (activeTime > 8 && runRatio > 0.78);
    const camperDetected = this.continuousIdleTime > 5.0 || (activeTime > 12 && runRatio < 0.32);

    const deathClusters = this.getDeathClusters(levelId);
    const levelDeathCount = this.deathRecords.filter((d) => d.levelId === levelId).length;
    const hottestCluster = deathClusters[0] ?? null;
    const maxClusterCount = hottestCluster ? hottestCluster.count : 0;
    const maxRecentCluster = hottestCluster ? hottestCluster.recentCount : 0;

    const repeatFailZone =
      hottestCluster && hottestCluster.count >= 3
        ? { x: hottestCluster.x, y: hottestCluster.y, count: hottestCluster.count }
        : null;

    // Dynamic death-clustering escalation specifically for Levels 10–100
    const isEscalationEligibleLevel = this.isEscalationLevel(levelId);
    let clusterEscalationTier: 0 | 1 | 2 | 3 = 0;
    let trapSpeedMultiplier = 1.0;
    let trapFrequencyMultiplier = 1.0;

    if (isEscalationEligibleLevel) {
      // Depth factor scales from 0.0 on Level 10 to 1.0 on Level 100
      const depth = Math.min(
        1,
        Math.max(0, (levelId - ESCALATION_MIN_LEVEL) / (ESCALATION_MAX_LEVEL - ESCALATION_MIN_LEVEL)),
      );

      if (maxClusterCount >= 6 || (maxClusterCount >= 5 && maxRecentCluster >= 3) || levelDeathCount >= 11) {
        clusterEscalationTier = 3;
      } else if (maxClusterCount >= 4 || (maxClusterCount >= 3 && maxRecentCluster >= 3) || levelDeathCount >= 6) {
        clusterEscalationTier = 2;
      } else if (maxClusterCount >= 2 || levelDeathCount >= 3) {
        clusterEscalationTier = 1;
      }

      if (clusterEscalationTier > 0) {
        // Continuous ramp driven by cluster density, rapid recency, and 100-level depth
        const clusterPressure =
          Math.max(0, maxClusterCount - 1) * 0.068 +
          Math.max(0, maxRecentCluster - 1) * 0.032 +
          Math.min(0.16, levelDeathCount * 0.013);
        const depthBonus = depth * 0.16 * (clusterEscalationTier / 3);

        trapSpeedMultiplier = Math.min(
          MAX_GLOBAL_SPEED_MULT,
          Number((1.06 + clusterPressure + depthBonus).toFixed(2)),
        );
        trapFrequencyMultiplier = Math.min(
          MAX_GLOBAL_FREQ_MULT,
          Number((1.09 + clusterPressure * 1.28 + depthBonus * 1.2).toFixed(2)),
        );
      }
    }

    let playstyleLabel = 'Observant Explorer';
    let activeModifierText: string | null = null;

    if (isEscalationEligibleLevel && clusterEscalationTier >= 3) {
      playstyleLabel = 'Cluster Magnet (Overdrive)';
      activeModifierText = `Death Cluster (${maxClusterCount}x) · Traps ${trapSpeedMultiplier.toFixed(2)}x speed, ${trapFrequencyMultiplier.toFixed(2)}x freq!`;
    } else if (isEscalationEligibleLevel && clusterEscalationTier === 2) {
      playstyleLabel = 'Stubborn Trap Bait';
      activeModifierText = `Death Cluster (${maxClusterCount}x) · Traps ${trapSpeedMultiplier.toFixed(2)}x faster + extra hazard!`;
    } else if (isEscalationEligibleLevel && clusterEscalationTier === 1) {
      playstyleLabel = 'Repeat Victim';
      activeModifierText = `Cluster Detected (${maxClusterCount}x) · Traps ramping (${trapSpeedMultiplier.toFixed(2)}x)`;
    } else if (jumpSpamDetected) {
      playstyleLabel = 'Hyperactive Jumper';
      activeModifierText = 'Adaptive: Low-clearance trap active — try walking.';
    } else if (rusherDetected) {
      playstyleLabel = 'Reckless Speedrunner';
      activeModifierText = 'Adaptive: Timing obstacle active — watch your pace.';
    } else if (camperDetected) {
      playstyleLabel = 'Cautious Overthinker';
      activeModifierText = 'Adaptive: Sweeper active — keep moving.';
    } else if (repeatFailZone) {
      playstyleLabel = 'Determined Optimist';
      activeModifierText =
        levelId <= HINT_SYSTEM_MAX_LEVEL
          ? null
          : 'Adaptive: Environmental clue revealed.';
    }

    return {
      playstyleLabel,
      jumpSpamDetected,
      rusherDetected,
      camperDetected,
      repeatFailZone,
      deathClusters,
      maxClusterCount,
      clusterEscalationTier,
      trapSpeedMultiplier,
      trapFrequencyMultiplier,
      isEscalationEligibleLevel,
      activeModifierText,
    };
  }
}

export const adaptiveDifficulty = new AdaptiveDifficultySystem();
