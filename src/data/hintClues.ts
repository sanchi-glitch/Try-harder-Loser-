import type { DeathCause, DeathCluster, LevelDef } from '../types/game';

export const HINT_SYSTEM_MAX_LEVEL = 30;
export const HINT_MIN_OBSTACLE_DEATHS = 3;

export interface ObstacleHintZone {
  id: string;
  minX: number;
  maxX: number;
  centerX: number;
  clueText: string;
  causes?: DeathCause[];
}

export interface ResolvedObstacleHint {
  obstacleKey: string;
  deathsOnObstacle: number;
  clueText: string;
  centerX: number;
  maxX: number;
}

/**
 * Cryptic, sarcastic per-obstacle clues for Levels 1–30.
 * Revealed strictly on the HUD ONLY after 3+ deaths on the same obstacle
 * AND after the player voluntarily completes a Rewarded Ad.
 */
const LEVEL_HINT_ZONES: Record<number, ObstacleHintZone[]> = {
  1: [
    {
      id: 'l1_gap',
      minX: 360,
      maxX: 560,
      centerX: 475,
      clueText: 'Gravity wins when you tap jump like it owes you money. Hold it.',
    },
    {
      id: 'l1_seam',
      minX: 740,
      maxX: 960,
      centerX: 855,
      clueText: 'A sign bragging "100% Solid"? Cute. Leap before the hairline crack.',
    },
  ],
  2: [
    {
      id: 'l2_gap',
      minX: 310,
      maxX: 500,
      centerX: 418,
      clueText: 'Momentum is free, unlike your dignity. Sprint before leaping.',
    },
    {
      id: 'l2_fake_break',
      minX: 710,
      maxX: 1020,
      centerX: 865,
      clueText: 'Stop fearing yesterday’s trauma. The marked tile holds; its quiet neighbor betrays.',
    },
    {
      id: 'l2_ceil',
      minX: 1110,
      maxX: 1410,
      centerX: 1265,
      clueText: 'The sign yells JUMP. The ceiling disagrees. Try using your legs.',
      causes: ['spike'],
    },
    {
      id: 'l2_popup',
      minX: 1405,
      maxX: 1580,
      centerX: 1480,
      clueText: 'That red scratch in the ink isn’t decorative. Hop before it wakes up.',
      causes: ['popup_spike'],
    },
  ],
  3: [
    {
      id: 'l3_high_step',
      minX: 295,
      maxX: 495,
      centerX: 400,
      clueText: 'High ledge, short thumb. Hold jump all the way from the brink.',
    },
    {
      id: 'l3_fake_flag',
      minX: 540,
      maxX: 750,
      centerX: 652,
      clueText: 'That flag has commitment issues. Clear the void; real safety waits beyond.',
    },
    {
      id: 'l3_spikes',
      minX: 820,
      maxX: 1135,
      centerX: 976,
      clueText: 'Two tiny teeth, zero patience. Light taps beat panic-mashing.',
      causes: ['spike'],
    },
    {
      id: 'l3_final_gap',
      minX: 1130,
      maxX: 1340,
      centerX: 1225,
      clueText: 'Full sprint, very edge, no hesitation. The void loves early jumpers.',
    },
  ],
  4: [
    {
      id: 'l4_crumbles',
      minX: 270,
      maxX: 855,
      centerX: 562,
      clueText: 'Cracked stone hates tourists. Touch down and bounce immediately.',
    },
    {
      id: 'l4_twin_drops',
      minX: 1055,
      maxX: 1510,
      centerX: 1290,
      clueText: 'One lying floor wasn’t enough. Spot both faint vertical seams and vault them.',
    },
    {
      id: 'l4_popup',
      minX: 1505,
      maxX: 1660,
      centerX: 1575,
      clueText: 'Relaxing near the exit? Classic mistake. Jump the red floor scar.',
      causes: ['popup_spike'],
    },
  ],
  5: [
    {
      id: 'l5_moving',
      minX: 270,
      maxX: 755,
      centerX: 515,
      clueText: 'Chasing a moving bus never works. Wait for the slab to come to you.',
    },
    {
      id: 'l5_saw',
      minX: 1205,
      maxX: 1385,
      centerX: 1298,
      clueText: 'Wait until the spinning teeth climb skyward, then slip underneath.',
      causes: ['saw'],
    },
    {
      id: 'l5_crumble',
      minX: 1400,
      maxX: 1775,
      centerX: 1595,
      clueText: 'Treat the cracked bridge like hot coals—one step and launch.',
    },
    {
      id: 'l5_popup',
      minX: 1765,
      maxX: 1925,
      centerX: 1838,
      clueText: 'Welcome to solid land—now jump immediately over the crimson seam.',
      causes: ['popup_spike'],
    },
  ],
  6: [
    {
      id: 'l6_stair_crumbles',
      minX: 230,
      maxX: 1025,
      centerX: 620,
      clueText: 'Four fragile steps, zero sightseeing. Chain each hop on first contact.',
    },
    {
      id: 'l6_late_crumble',
      minX: 1220,
      maxX: 1600,
      centerX: 1415,
      clueText: 'Don’t admire the fourth cracked stone. Spring straight across.',
    },
    {
      id: 'l6_popup',
      minX: 1580,
      maxX: 1750,
      centerX: 1660,
      clueText: 'That "Safe Landing" sign was written by the spike waiting right there.',
      causes: ['popup_spike'],
    },
  ],
  7: [
    {
      id: 'l7_saw',
      minX: 430,
      maxX: 960,
      centerX: 680,
      clueText: 'A patrolling blade hates heights. Use the upper perch—ignore the shiny bait.',
      causes: ['saw'],
    },
    {
      id: 'l7_crumble',
      minX: 1140,
      maxX: 1530,
      centerX: 1340,
      clueText: 'Touch, launch, repeat. Hesitating on cracked ink is a hobby you should quit.',
    },
    {
      id: 'l7_crusher_spike',
      minX: 1530,
      maxX: 1870,
      centerX: 1705,
      clueText: 'Flirt with the angry sky-block, back off as it slams, then clear the spike.',
    },
  ],
  8: [
    {
      id: 'l8_moving',
      minX: 270,
      maxX: 785,
      centerX: 525,
      clueText: 'Let the shuttle swing near before boarding. Jumping into empty air is bold, not smart.',
    },
    {
      id: 'l8_saw',
      minX: 1220,
      maxX: 1420,
      centerX: 1315,
      clueText: 'Run beneath the blade on its upward climb—not while it’s kissing the floor.',
      causes: ['saw'],
    },
    {
      id: 'l8_double_crumble',
      minX: 1380,
      maxX: 1975,
      centerX: 1680,
      clueText: 'Two ascending cracked stones. Keep full momentum and never stop to think.',
    },
    {
      id: 'l8_popup',
      minX: 1965,
      maxX: 2110,
      centerX: 2035,
      clueText: 'Landed safely? Wrong. Hop the red hairline immediately.',
      causes: ['popup_spike'],
    },
  ],
  9: [
    {
      id: 'l9_drop_chain',
      minX: 240,
      maxX: 940,
      centerX: 590,
      clueText: 'Every faint vertical floor seam is an unpaid bill. Jump before each cut.',
    },
    {
      id: 'l9_popup',
      minX: 1050,
      maxX: 1230,
      centerX: 1140,
      clueText: 'Even the paid floor holds a grudge. Hop the crimson slit past the flag.',
      causes: ['popup_spike'],
    },
    {
      id: 'l9_late_gauntlet',
      minX: 1240,
      maxX: 1900,
      centerX: 1620,
      clueText: 'Hop the cracked slab, slip under the rising saw, then vault one last seam.',
    },
  ],
  10: [
    {
      id: 'l10_moving_pair',
      minX: 240,
      maxX: 1040,
      centerX: 640,
      clueText: 'Two shuttles out of sync. Ride the first until the second glides to meet you.',
    },
    {
      id: 'l10_crumble',
      minX: 1310,
      maxX: 1690,
      centerX: 1505,
      clueText: 'One fleeting stone before the finale. Don’t unpack your luggage on it.',
    },
    {
      id: 'l10_crusher_popup',
      minX: 1680,
      maxX: 2050,
      centerX: 1865,
      clueText: 'Tease the overhead crusher first; once it drops, leap the red floor scar.',
    },
  ],
  11: [
    {
      id: 'l11_walk_only',
      minX: 240,
      maxX: 1520,
      centerX: 840,
      clueText: 'Your jump button is the actual villain here. Try walking like a normal person.',
    },
  ],
  12: [
    {
      id: 'l12_start_adaptive',
      minX: 100,
      maxX: 520,
      centerX: 320,
      clueText: 'It’s studying your habits. Don’t spam jump under ceilings, and don’t camp.',
    },
    {
      id: 'l12_crumble_mid',
      minX: 500,
      maxX: 1140,
      centerX: 780,
      clueText: 'Bounce cleanly off the cracked block, and watch your pace past the flag.',
    },
    {
      id: 'l12_drop_popup',
      minX: 1180,
      maxX: 1640,
      centerX: 1400,
      clueText: 'Ignore "Sprint Straight." Jump the faint seam, then clear the red slit ahead.',
    },
  ],
  13: [
    {
      id: 'l13_invis_trio',
      minX: 260,
      maxX: 1080,
      centerX: 675,
      clueText: 'Squint at the faint dashed ghosts—they hold weight even if your trust doesn’t.',
    },
    {
      id: 'l13_popup',
      minX: 1150,
      maxX: 1330,
      centerX: 1240,
      clueText: 'Solid ground isn’t your friend either. Leap the red mark after the checkpoint.',
      causes: ['popup_spike'],
    },
    {
      id: 'l13_end_invis',
      minX: 1330,
      maxX: 1890,
      centerX: 1615,
      clueText: 'Cracked stone into one last dashed ghost. Aim for the faint outline.',
    },
  ],
  14: [
    {
      id: 'l14_invis_mix',
      minX: 340,
      maxX: 1170,
      centerX: 760,
      clueText: 'The sign says NO FLOOR because it’s a liar. Follow the dashed ghosts and cracked step.',
    },
    {
      id: 'l14_saw',
      minX: 1260,
      maxX: 1440,
      centerX: 1345,
      clueText: 'Wait for the blade’s upward breath, then glide straight under.',
      causes: ['saw'],
    },
    {
      id: 'l14_end_combo',
      minX: 1500,
      maxX: 2060,
      centerX: 1790,
      clueText: 'Walk beneath the ceiling teeth, bait the falling slab, then hop the final spike.',
    },
  ],
  15: [
    {
      id: 'l15_early_crumble',
      minX: 310,
      maxX: 695,
      centerX: 505,
      clueText: 'Just one fragile bridge—don’t make it a tragic biography. Touch and go.',
    },
    {
      id: 'l15_saw_moving',
      minX: 1220,
      maxX: 2070,
      centerX: 1640,
      clueText: 'Slip under saw #1, time the shuttle under saw #2, and spring off the cracked slab.',
    },
    {
      id: 'l15_final_popup',
      minX: 2050,
      maxX: 2220,
      centerX: 2135,
      clueText: 'The ink at your landing spot bites. Jump the instant your boots touch down.',
      causes: ['popup_spike'],
    },
  ],
  16: [
    {
      id: 'l16_vip_saw',
      minX: 430,
      maxX: 1280,
      centerX: 850,
      clueText: 'Locked out? Climb upstairs and slap the fake VIP door to drop the lower wall.',
    },
    {
      id: 'l16_crumbles_popup',
      minX: 1280,
      maxX: 2010,
      centerX: 1660,
      clueText: 'Two fast cracked hops, then jump immediately past the red seam on touchdown.',
    },
  ],
  17: [
    {
      id: 'l17_crumble_saw',
      minX: 240,
      maxX: 1065,
      centerX: 650,
      clueText: 'Time your first cracked leap so the airborne blade is high when you cross.',
    },
    {
      id: 'l17_saw_drop',
      minX: 1180,
      maxX: 1560,
      centerX: 1390,
      clueText: 'Pass the saw, then immediately leap—the floor right behind it drops out.',
    },
    {
      id: 'l17_crusher_popup',
      minX: 1580,
      maxX: 1960,
      centerX: 1765,
      clueText: 'Bait the falling block from afar, then hop the crimson slit before chasing the door.',
    },
  ],
  18: [
    {
      id: 'l18_moving_pair',
      minX: 240,
      maxX: 1060,
      centerX: 650,
      clueText: 'Fast shuttles punish panic. Wait for the inward swing before committing.',
    },
    {
      id: 'l18_mid_popup_crumble',
      minX: 1150,
      maxX: 1730,
      centerX: 1440,
      clueText: 'Clear the hidden spike after the flag, then rebound off the cracked tile.',
    },
    {
      id: 'l18_double_popup',
      minX: 1740,
      maxX: 2140,
      centerX: 1925,
      clueText: 'Ignore the shiny trophy and respect both red floor scars—they come in pairs.',
    },
  ],
  19: [
    {
      id: 'l19_invis_crumble',
      minX: 240,
      maxX: 1090,
      centerX: 665,
      clueText: 'Ghost ledge, cracked stone, ghost ledge. Trust the faint dashes and keep moving.',
    },
    {
      id: 'l19_saw_ceil',
      minX: 1190,
      maxX: 1800,
      centerX: 1520,
      clueText: 'For once, obey the sign: slip past the saw and walk flat under the spiky roof.',
    },
    {
      id: 'l19_spike_crusher',
      minX: 1800,
      maxX: 2160,
      centerX: 1960,
      clueText: 'Short-hop the floor spike, then tease the overhead crusher before sprinting.',
    },
  ],
  20: [
    {
      id: 'l20_early_crumble',
      minX: 270,
      maxX: 660,
      centerX: 470,
      clueText: 'One quick cracked bridge—touch it lightly and move on to Fake Exit #1.',
    },
    {
      id: 'l20_saw_moving',
      minX: 1120,
      maxX: 1750,
      centerX: 1440,
      clueText: 'Dash beneath the rising saw, then let the shuttle glide close before leaping.',
    },
    {
      id: 'l20_end_crusher_popup',
      minX: 2040,
      maxX: 2400,
      centerX: 2215,
      clueText: 'Bait the sky-crusher to slam first, then vault the crimson floor seam.',
    },
  ],
  21: [
    {
      id: 'l21_triple_crumble',
      minX: 220,
      maxX: 1100,
      centerX: 660,
      clueText: 'Zero-point-three seconds per stone. Sprint nonstop—thinking is fatal.',
    },
    {
      id: 'l21_saw_crumble',
      minX: 1190,
      maxX: 1980,
      centerX: 1580,
      clueText: 'Slip under the rising blade, then chain both cracked stones in one rhythm.',
    },
    {
      id: 'l21_double_popup',
      minX: 1970,
      maxX: 2270,
      centerX: 2100,
      clueText: 'Two red slits waiting on the finish stretch. Land ready to double-hop.',
      causes: ['popup_spike'],
    },
  ],
  22: [
    {
      id: 'l22_first_popup',
      minX: 390,
      maxX: 680,
      centerX: 560,
      clueText: 'Overshoot the first landing edge—a hidden spike guards the welcome mat.',
    },
    {
      id: 'l22_fake_drop',
      minX: 740,
      maxX: 960,
      centerX: 860,
      clueText: 'Déjà vu works best when you don’t forget Level 1. Jump the marked seam.',
    },
    {
      id: 'l22_second_half',
      minX: 1250,
      maxX: 2240,
      centerX: 1760,
      clueText: 'Time the saw, rebound off cracked stone onto the shuttle, and hop the final seam.',
    },
  ],
  23: [
    {
      id: 'l23_short_hop_tunnel',
      minX: 250,
      maxX: 940,
      centerX: 560,
      clueText: 'Holding jump feeds the ceiling spikes. Feather-tap jump to skim over the floor teeth.',
    },
    {
      id: 'l23_invis_pair',
      minX: 950,
      maxX: 1595,
      centerX: 1275,
      clueText: 'Two ascending dashed ghosts. Commit to full leaps between their outlines.',
    },
    {
      id: 'l23_twin_crushers',
      minX: 1720,
      maxX: 2320,
      centerX: 2040,
      clueText: 'Bait each overhead crusher one at a time, then hop the crimson seam before the door.',
    },
  ],
  24: [
    {
      id: 'l24_patrol_saws',
      minX: 240,
      maxX: 1060,
      centerX: 650,
      clueText: 'Floor blades can’t climb. Hop onto the perches and let them pass below.',
    },
    {
      id: 'l24_crumbles',
      minX: 1100,
      maxX: 1735,
      centerX: 1420,
      clueText: 'Two fragile stairs climbing upward. Keep full running speed on both.',
    },
    {
      id: 'l24_crusher_saw',
      minX: 1830,
      maxX: 2280,
      centerX: 2050,
      clueText: 'Trigger the crusher and step back, then slip under the vertical blade’s peak.',
    },
  ],
  25: [
    {
      id: 'l25_sky_chain',
      minX: 230,
      maxX: 1185,
      centerX: 700,
      clueText: 'Shuttle to dashed ghost to cracked stone—ride close before launching.',
    },
    {
      id: 'l25_drop_saws',
      minX: 1430,
      maxX: 2050,
      centerX: 1740,
      clueText: 'Vault the loose floor seam, then weave beneath both vertical saws as they climb.',
    },
    {
      id: 'l25_chase_popups',
      minX: 2150,
      maxX: 2610,
      centerX: 2375,
      clueText: 'Stop tunnel-visioning on the fleeing door—two red seams hide along the chase.',
    },
  ],
  26: [
    {
      id: 'l26_skyway',
      minX: 210,
      maxX: 1350,
      centerX: 780,
      clueText: 'Cracked, ghost, cracked, ghost—and time the midair saw at the apex.',
    },
    {
      id: 'l26_saw_crumble',
      minX: 1450,
      maxX: 2020,
      centerX: 1735,
      clueText: 'Duck beneath the rising blade and bounce off the 0.3s stone without blinking.',
    },
    {
      id: 'l26_end_gauntlet',
      minX: 2050,
      maxX: 2450,
      centerX: 2245,
      clueText: 'Draw the crusher down first, wait for it to rise, then vault the red floor slit.',
    },
  ],
  27: [
    {
      id: 'l27_moving_duo',
      minX: 380,
      maxX: 1225,
      centerX: 800,
      clueText: 'Two fast shuttles out of phase. Ride to the inner edge before jumping across.',
    },
    {
      id: 'l27_drop_stretch',
      minX: 1490,
      maxX: 1920,
      centerX: 1710,
      clueText: 'Leap the loose floor seam, then immediately clear the hidden spike beyond.',
    },
    {
      id: 'l27_patrol_end',
      minX: 1920,
      maxX: 2450,
      centerX: 2175,
      clueText: 'Ignore the shiny trap trophy. Leap cleanly over the floor saw, then the final red scar.',
    },
  ],
  28: [
    {
      id: 'l28_start_saws',
      minX: 210,
      maxX: 600,
      centerX: 385,
      clueText: 'Two staggered vertical blades. Wait for each upward beat instead of praying.',
    },
    {
      id: 'l28_invis_crumble_1',
      minX: 670,
      maxX: 1325,
      centerX: 1000,
      clueText: 'Dashed ghost into a 0.29s stone. Full sprint from the edge—no tiny hops.',
    },
    {
      id: 'l28_crusher_sky',
      minX: 1740,
      maxX: 2580,
      centerX: 2180,
      clueText: 'Bait the crusher, then time the airborne saw between the cracked stone and ghost ledge.',
    },
  ],
  29: [
    {
      id: 'l29_short_hop',
      minX: 190,
      maxX: 730,
      centerX: 445,
      clueText: 'Feather-tap jump—holding it guarantees a ceiling haircut.',
    },
    {
      id: 'l29_crumbles_moving',
      minX: 730,
      maxX: 2145,
      centerX: 1440,
      clueText: 'Chain both cracked blocks, bait crusher #1, then ride the shuttle cleanly.',
    },
    {
      id: 'l29_final_gauntlet',
      minX: 2170,
      maxX: 2710,
      centerX: 2430,
      clueText: 'Slip under the saw, tease crusher #2, then jump the crimson slit before the door scoots.',
    },
  ],
  30: [
    {
      id: 'l30_opening_sky',
      minX: 280,
      maxX: 1190,
      centerX: 735,
      clueText: 'Cracked, dashed ghost, cracked. Zero hesitation—your shadow barely keeps up.',
    },
    {
      id: 'l30_mid_twist',
      minX: 1200,
      maxX: 1920,
      centerX: 1560,
      clueText: 'Dodge the saw, trigger the fake exit wall, and bait the crusher right past the flag.',
    },
    {
      id: 'l30_moving_crumble',
      minX: 1910,
      maxX: 2590,
      centerX: 2250,
      clueText: 'Ride the shuttle to its right peak, then spring straight off the fragile stone.',
    },
    {
      id: 'l30_final_chase',
      minX: 2580,
      maxX: 3000,
      centerX: 2770,
      clueText: 'Skip the fake crown—two hidden crimson seams wait along the fleeing door’s path.',
    },
  ],
};

function buildFallbackClue(cause: DeathCause, levelDef: LevelDef): string {
  switch (cause) {
    case 'popup_spike':
      return 'Look closer at the floor—crimson hairline slits always spring upward.';
    case 'spike':
      return 'Either the ceiling wants your skull, or a feather-tap jump beats holding the button.';
    case 'saw':
      return 'Blades follow a rhythm, unlike your panic. Wait for the open beat.';
    case 'falling_block':
      return 'Angry ceiling bricks crave attention. Step near to bait them, then step back.';
    case 'fake_drop':
      return 'Solid ink isn’t always loyal. Watch for faint seams—or suspiciously quiet neighbors.';
    case 'sweeper':
      return 'Standing around invites the sweeper. Keep moving and hop cleanly over it.';
    case 'pit':
    default:
      if (levelDef.adaptiveClue?.text) {
        return `Still struggling? ${levelDef.adaptiveClue.text}`;
      }
      return 'Full speed to the very lip, then hold jump—air is not a load-bearing floor.';
  }
}

/**
 * Resolves the cryptic, sarcastic clue for Levels 1–30 after the player dies
 * (strictly disabled on Levels 31+ and hidden before the first death on a level).
 * Prioritizes repeat-death obstacles (3+), then any obstacle where the player died (1+),
 * and falls back to the nearest upcoming signature clue for the level.
 */
export function resolveObstacleHintForHud(
  levelDef: LevelDef,
  playerX: number,
  getZoneDeathCount: (levelId: number, minX: number, maxX: number, causes?: DeathCause[]) => number,
  deathClusters: DeathCluster[],
  levelDeaths = 0,
): ResolvedObstacleHint | null {
  if (levelDef.id < 1 || levelDef.id > HINT_SYSTEM_MAX_LEVEL) {
    return null;
  }

  const clusterDeathTotal = deathClusters.reduce((sum, c) => sum + c.count, 0);
  const effectiveDeaths = Math.max(levelDeaths, clusterDeathTotal);
  if (effectiveDeaths < 1) {
    return null;
  }

  const zones = LEVEL_HINT_ZONES[levelDef.id] ?? [];
  const highRepeatCandidates: ResolvedObstacleHint[] = [];
  const singleDeathCandidates: ResolvedObstacleHint[] = [];

  for (const zone of zones) {
    const count = getZoneDeathCount(levelDef.id, zone.minX, zone.maxX, zone.causes);
    if (count < 1) continue;
    const item: ResolvedObstacleHint = {
      obstacleKey: `lv${levelDef.id}:${zone.id}`,
      deathsOnObstacle: count,
      clueText: zone.clueText,
      centerX: zone.centerX,
      maxX: zone.maxX,
    };
    if (count >= HINT_MIN_OBSTACLE_DEATHS) {
      highRepeatCandidates.push(item);
    } else {
      singleDeathCandidates.push(item);
    }
  }

  // Include spatial death clusters not already covered by a mapped zone
  for (const cluster of deathClusters) {
    if (cluster.count < 1) continue;
    const coveredByZone = zones.some(
      (z) => cluster.x >= z.minX - 45 && cluster.x <= z.maxX + 45,
    );
    if (coveredByZone) continue;

    const bucket = Math.round(cluster.x / 140);
    const item: ResolvedObstacleHint = {
      obstacleKey: `lv${levelDef.id}:cluster_${bucket}`,
      deathsOnObstacle: cluster.count,
      clueText: buildFallbackClue(cluster.dominantCause ?? 'pit', levelDef),
      centerX: cluster.x,
      maxX: cluster.x + 120,
    };
    if (cluster.count >= HINT_MIN_OBSTACLE_DEATHS) {
      highRepeatCandidates.push(item);
    } else {
      singleDeathCandidates.push(item);
    }
  }

  const pickClosestRelevant = (list: ResolvedObstacleHint[]): ResolvedObstacleHint | null => {
    const relevant = list.filter((c) => playerX <= c.maxX + 185);
    if (relevant.length === 0) return null;
    relevant.sort((a, b) => {
      const distA = Math.abs(a.centerX - playerX);
      const distB = Math.abs(b.centerX - playerX);
      return distA - distB || b.deathsOnObstacle - a.deathsOnObstacle;
    });
    return relevant[0];
  };

  const primary =
    pickClosestRelevant(highRepeatCandidates) ??
    pickClosestRelevant(singleDeathCandidates);
  if (primary) {
    return primary;
  }

  // Fallback: player died on this level and moved past their death spot —
  // provide the level's signature cryptic clue for the upcoming stretch.
  const upcomingZone =
    zones.find((z) => playerX <= z.maxX + 120) ?? zones[zones.length - 1] ?? null;

  if (upcomingZone) {
    return {
      obstacleKey: `lv${levelDef.id}:${upcomingZone.id}`,
      deathsOnObstacle: effectiveDeaths,
      clueText: upcomingZone.clueText,
      centerX: upcomingZone.centerX,
      maxX: upcomingZone.maxX,
    };
  }

  const hottest = deathClusters[0];
  return {
    obstacleKey: `lv${levelDef.id}:level_clue`,
    deathsOnObstacle: effectiveDeaths,
    clueText: buildFallbackClue(hottest?.dominantCause ?? 'pit', levelDef),
    centerX: hottest?.x ?? playerX,
    maxX: levelDef.worldWidth,
  };
}
