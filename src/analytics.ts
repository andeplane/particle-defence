import mixpanel from 'mixpanel-browser';
import type { MatchStats } from './stats/types';
import type { GridType } from './grid/generators/index';

const TOKEN = 'b5022dd7fe5b3cd0396d84284ae647e6';

export function initAnalytics(): void {
  mixpanel.init(TOKEN, { track_pageview: false, persistence: 'localStorage' });
}

export function trackLoad(): void {
  mixpanel.track('ParticleDefence.Load');
}

export function trackHowToPlayClicked(): void {
  mixpanel.track('ParticleDefence.HowToPlay.Clicked');
}

const TAB_LABEL: Record<string, string> = {
  overview:   'Overview',
  techTree:   'TechTree',
  combat:     'Combat',
  strategies: 'Strategies',
};

export function trackHowToPlayTabClicked(tabId: string): void {
  const label = TAB_LABEL[tabId] ?? tabId;
  mixpanel.track(`ParticleDefence.HowToPlay.${label}.Clicked`);
}

export function trackGameStarted(mode: string, gridType: GridType): void {
  mixpanel.track('ParticleDefence.Game.Started', { mode, map: gridType });
}

export function trackGameEnded(
  stats: MatchStats,
  mode: string,
  gridType: GridType,
  gameStartTime: number,
): void {
  const final = stats.samples.at(-1);

  const nukes = ([0, 1] as const).map(p =>
    stats.events.filter(e => e.player === p && e.type === 'nuke').length,
  );
  const totalKills = ([0, 1] as const).map(p =>
    stats.samples.reduce((sum, s) => sum + s.killsThisSecond[p], 0),
  );
  const totalGoldProduced = ([0, 1] as const).map(p =>
    stats.samples.reduce((sum, s) => sum + s.goldIncome[p], 0),
  );
  const totalGoldSpent = ([0, 1] as const).map(p =>
    stats.samples.reduce((sum, s) => sum + s.goldSpent[p], 0),
  );
  const totalDamageDealt = ([0, 1] as const).map(p =>
    stats.samples.reduce((sum, s) => sum + s.unitDamageDealt[p] + s.baseDamageDealt[p], 0),
  );
  const peakArmySize = ([0, 1] as const).map(p =>
    stats.samples.reduce((max, s) => Math.max(max, s.aliveUnits[p]), 0),
  );

  const realTimeSec = Math.round((Date.now() - gameStartTime) / 1000);

  mixpanel.track('ParticleDefence.Game.Ended', {
    winner:                stats.winner,
    game_duration_seconds: Math.round(stats.durationSec),
    real_time_seconds:     realTimeSec,
    mode,
    map:                   gridType,

    p1_base_hp:            final?.baseHP[0] ?? 0,
    p2_base_hp:            final?.baseHP[1] ?? 0,
    p1_army_size:          final?.aliveUnits[0] ?? 0,
    p2_army_size:          final?.aliveUnits[1] ?? 0,
    p1_tower_count:        final?.towerCount[0] ?? 0,
    p2_tower_count:        final?.towerCount[1] ?? 0,
    p1_tower_kills:        final?.towerKillsCumulative[0] ?? 0,
    p2_tower_kills:        final?.towerKillsCumulative[1] ?? 0,
    p1_territory_cells:    final?.territoryCells[0] ?? 0,
    p2_territory_cells:    final?.territoryCells[1] ?? 0,
    p1_gold_banked:        final?.goldBanked[0] ?? 0,
    p2_gold_banked:        final?.goldBanked[1] ?? 0,

    p1_level_health:        final?.upgradeLevels[0].health ?? 0,
    p1_level_attack:        final?.upgradeLevels[0].attack ?? 0,
    p1_level_radius:        final?.upgradeLevels[0].radius ?? 0,
    p1_level_spawn_rate:    final?.upgradeLevels[0].spawnRate ?? 0,
    p1_level_speed:         final?.upgradeLevels[0].speed ?? 0,
    p1_level_max_particles: final?.upgradeLevels[0].maxParticles ?? 0,
    p1_level_defense:       final?.upgradeLevels[0].defense ?? 0,
    p1_level_interest:      final?.upgradeLevels[0].interestRate ?? 0,
    p2_level_health:        final?.upgradeLevels[1].health ?? 0,
    p2_level_attack:        final?.upgradeLevels[1].attack ?? 0,
    p2_level_radius:        final?.upgradeLevels[1].radius ?? 0,
    p2_level_spawn_rate:    final?.upgradeLevels[1].spawnRate ?? 0,
    p2_level_speed:         final?.upgradeLevels[1].speed ?? 0,
    p2_level_max_particles: final?.upgradeLevels[1].maxParticles ?? 0,
    p2_level_defense:       final?.upgradeLevels[1].defense ?? 0,
    p2_level_interest:      final?.upgradeLevels[1].interestRate ?? 0,

    p1_total_kills:     totalKills[0],
    p2_total_kills:     totalKills[1],
    p1_gold_produced:   totalGoldProduced[0],
    p2_gold_produced:   totalGoldProduced[1],
    p1_gold_spent:      totalGoldSpent[0],
    p2_gold_spent:      totalGoldSpent[1],
    p1_damage_dealt:    Math.round(totalDamageDealt[0]),
    p2_damage_dealt:    Math.round(totalDamageDealt[1]),
    p1_peak_army_size:  peakArmySize[0],
    p2_peak_army_size:  peakArmySize[1],
    p1_nukes:           nukes[0],
    p2_nukes:           nukes[1],
  });
}
