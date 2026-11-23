import type {
  CheckpointDef,
  ExitDef,
  FakeRewardDef,
  HazardDef,
  LevelDef,
  PlatformDef,
  SignDef,
} from '../types/game';

export const EXTENDED_CHAPTERS = [
  { id: 7, title: 'Zero Sympathy', subtitle: 'Your confidence ends right here.' },
  { id: 8, title: 'Architectural Malice', subtitle: 'Every brick was placed out of spite.' },
  { id: 9, title: 'Gravity Has Grudges', subtitle: 'Blink once and meet the void.' },
  { id: 10, title: 'False Hope Factory', subtitle: 'Checkpoints lie. Doors sprint. Floors vanish.' },
  { id: 11, title: 'Thumb Destroyer', subtitle: 'Halfway to 100 and already crumbling.' },
  { id: 12, title: 'Gaslight Gauntlet', subtitle: 'The level knows what you are about to press.' },
  { id: 13, title: 'Sawblade Symphony', subtitle: 'Red steel, thin margins, zero forgiveness.' },
  { id: 14, title: 'Invisible Betrayal', subtitle: 'Guess wrong, die instantly, repeat.' },
  { id: 15, title: 'Rage Quit Boulevard', subtitle: 'Close the tab. Save your dignity.' },
  { id: 16, title: 'Sub-Second Survival', subtitle: '0.25s floors and crushers with personal vendettas.' },
  { id: 17, title: 'Psychological Ruin', subtitle: 'Every trap is a personal insult.' },
  { id: 18, title: 'Delusion Check', subtitle: 'You still think you are reaching 100?' },
  { id: 19, title: 'Gatekeepers of Hell', subtitle: 'Only stubborn maniacs survive past 90.' },
  { id: 20, title: 'THE PEAK OF SUFFERING', subtitle: '99 breaks your spirit. 100 is literally impossible.' },
] as const;

interface CruelLevelSpec {
  id: number;
  name: string;
  subtitle: string;
  archetype: 0 | 1 | 2 | 3 | 4;
}

const CRUEL_SPECS_31_TO_95: CruelLevelSpec[] = [
  // Chapter 7 (31-35)
  { id: 31, name: 'Still Here, Idiot?', subtitle: 'You survived 30 and thought the tutorial was over.', archetype: 0 },
  { id: 32, name: 'Floor Subscription Expired', subtitle: 'Please renew your ground privileges mid-air.', archetype: 1 },
  { id: 33, name: 'Smile For The Buzzsaw', subtitle: 'Three blades, one fragile ego.', archetype: 2 },
  { id: 34, name: 'Invisible Means Die', subtitle: 'Memory test with sharp consequences.', archetype: 3 },
  { id: 35, name: 'Fake Exit, Real Tears', subtitle: 'Touch the door. Go ahead. I dare you.', archetype: 4 },

  // Chapter 8 (36-40)
  { id: 36, name: 'Your Thumbs Look Tired', subtitle: 'Good. Now jump four collapsing slabs.', archetype: 1 },
  { id: 37, name: 'Ceiling Kisses', subtitle: 'Jump one pixel too high and repaint the spikes.', archetype: 2 },
  { id: 38, name: 'Trust Issues: Deluxe Edition', subtitle: 'Even the safe tiles are plotting.', archetype: 0 },
  { id: 39, name: 'Crusher Roulette', subtitle: 'Bait the concrete or become a pancake.', archetype: 3 },
  { id: 40, name: 'Half-Baked Reflexes', subtitle: 'The door runs faster than your brain.', archetype: 4 },

  // Chapter 9 (41-45)
  { id: 41, name: 'Gravity Sends Regards', subtitle: 'You cannot outrun bad timing.', archetype: 0 },
  { id: 42, name: 'Shattered Hopes', subtitle: '0.28 seconds is plenty. For someone good.', archetype: 1 },
  { id: 43, name: 'Blender Hallway', subtitle: 'Step inside the rotating red smoothie maker.', archetype: 2 },
  { id: 44, name: 'Ghost Floor Gamble', subtitle: 'Blind faith meets blind stupidity.', archetype: 3 },
  { id: 45, name: 'Try Harder, Loser! (Classic)', subtitle: 'We named the game after your playstyle.', archetype: 4 },

  // Chapter 10 (46-50)
  { id: 46, name: 'Checkpoint? Never Heard Of Her', subtitle: 'Watch your safety net fly away laughing.', archetype: 0 },
  { id: 47, name: 'Paper-Thin Patience', subtitle: 'Four crumbling ledges over a bottomless roast.', archetype: 1 },
  { id: 48, name: 'Low-Clearance Lobotomy', subtitle: 'Feather the jump or lose your head.', archetype: 2 },
  { id: 49, name: 'Midpoint Massacre', subtitle: 'You are barely halfway. Turn back now.', archetype: 3 },
  { id: 50, name: '50% Done, 100% Broken', subtitle: 'Halfway boss gauntlet. Earn your tears.', archetype: 4 },

  // Chapter 11 (51-55)
  { id: 51, name: 'Second Half Starts Mean', subtitle: 'Everything before 50 was a warm-up.', archetype: 1 },
  { id: 52, name: 'Pop-Up Panic Attack', subtitle: 'The floor seams now hate you personally.', archetype: 0 },
  { id: 53, name: 'Vertical Meat Grinder', subtitle: 'Thread the needle between screaming blades.', archetype: 2 },
  { id: 54, name: 'Schrödinger’s Ledge', subtitle: 'It exists only if you guess the right pixel.', archetype: 3 },
  { id: 55, name: 'Sprint Or Splatter', subtitle: 'Crushers above, spikes below, cowardice behind.', archetype: 4 },

  // Chapter 12 (56-60)
  { id: 56, name: 'Signs Are For Suckers', subtitle: 'Still reading the hints? Adorable.', archetype: 0 },
  { id: 57, name: 'Crumble Dominoes', subtitle: 'Hesitate for 0.1s and admire the void.', archetype: 1 },
  { id: 58, name: 'Sawdust & Regret', subtitle: 'High-speed blades tuned to your panic.', archetype: 2 },
  { id: 59, name: 'Blindfolded Acrobatics', subtitle: 'No floor graphics. Pure suffering.', archetype: 3 },
  { id: 60, name: 'Certified Clown License', subtitle: 'Fake door, real wall, angry sweepers.', archetype: 4 },

  // Chapter 13 (61-65)
  { id: 61, name: 'Blade Runner (Literally)', subtitle: 'Keep moving or get diced.', archetype: 2 },
  { id: 62, name: 'Trap Floor Symphony', subtitle: 'Drop tiles timed to your exact landing.', archetype: 0 },
  { id: 63, name: 'Dust In The Wind', subtitle: 'Tiny crumble platforms, massive ego damage.', archetype: 1 },
  { id: 64, name: 'Invisible Guillotine', subtitle: 'Airborne blocks plus falling concrete.', archetype: 3 },
  { id: 65, name: 'Exit Has Restraining Order', subtitle: 'Even Level 65 wants you gone.', archetype: 4 },

  // Chapter 14 (66-70)
  { id: 66, name: 'Air Is Not Solid', subtitle: 'Except where it is. Good luck guessing.', archetype: 3 },
  { id: 67, name: 'Floor Is Liquid Betrayal', subtitle: 'Every seam hides a 0.14s ambush.', archetype: 0 },
  { id: 68, name: 'Micro-Ledge Madness', subtitle: 'Narrow platforms for wide mistakes.', archetype: 1 },
  { id: 69, name: 'Nice? Not For You.', subtitle: 'Zero jokes here. Just sharp red pain.', archetype: 2 },
  { id: 70, name: 'Seventy Shades Of Failure', subtitle: 'Double betrayal marathon. Still clicking retry?', archetype: 4 },

  // Chapter 15 (71-75)
  { id: 71, name: 'Close The Tab Already', subtitle: 'This is an intervention. Stop embarrassing yourself.', archetype: 0 },
  { id: 72, name: 'Crumble Express', subtitle: 'Quarter-second platforms. Do not even breathe.', archetype: 1 },
  { id: 73, name: 'Buzzsaw Ballet', subtitle: 'Dance between four hyper-speed saws.', archetype: 2 },
  { id: 74, name: 'Phantom Skybridge', subtitle: 'Invisible hops guarded by falling hammers.', archetype: 3 },
  { id: 75, name: 'Three-Quarters Dead', subtitle: '75 levels in and your stickman still hates you.', archetype: 4 },

  // Chapter 16 (76-80)
  { id: 76, name: 'Quarter-Second Funeral', subtitle: '0.24s crumble timing. Blink and perish.', archetype: 1 },
  { id: 77, name: 'Trapdoor Tornado', subtitle: 'Fake floors feeding directly into saws.', archetype: 0 },
  { id: 78, name: 'Spike Tunnel Syndrome', subtitle: 'Micro-hops under a ceiling of pure malice.', archetype: 2 },
  { id: 79, name: 'Ghost Walk Of Shame', subtitle: 'Invisible islands and zero forgiveness.', archetype: 3 },
  { id: 80, name: 'Eighty Reasons To Quit', subtitle: 'Fake trophy, fake checkpoint, fake door, real pain.', archetype: 4 },

  // Chapter 17 (81-85)
  { id: 81, name: 'Mental Breakdown Lane', subtitle: 'Adaptive traps are laughing at your death clusters.', archetype: 0 },
  { id: 82, name: 'Paper Bridges Burning', subtitle: 'Five chained fragile jumps over abyss.', archetype: 1 },
  { id: 83, name: 'Hyper-Saw Massacre', subtitle: 'Timing windows smaller than your attention span.', archetype: 2 },
  { id: 84, name: 'Memory Loss Simulator', subtitle: 'Forgot where the invisible block was? Try again.', archetype: 3 },
  { id: 85, name: 'Runaway Reality', subtitle: 'Chase the exit through three consecutive ambushes.', archetype: 4 },

  // Chapter 18 (86-90)
  { id: 86, name: 'Delusion Level: Maximum', subtitle: 'You honestly think you are surviving the 90s?', archetype: 1 },
  { id: 87, name: 'No Safe Pixels Left', subtitle: 'Every landing strip is rigged.', archetype: 0 },
  { id: 88, name: 'Twin Crusher Waltz', subtitle: 'Saws + concrete + zero room to panic.', archetype: 2 },
  { id: 89, name: 'Invisible Nightmare', subtitle: 'Thin air and high-velocity regret.', archetype: 3 },
  { id: 90, name: 'Welcome To The Final Ten', subtitle: '90 down. The cruelest 10 levels on Earth remain.', archetype: 4 },

  // Chapter 19 (91-95)
  { id: 91, name: 'Gatekeeper #1: Ego Check', subtitle: 'Every gap is stretched to your breaking point.', archetype: 0 },
  { id: 92, name: 'Gatekeeper #2: Crumble Hell', subtitle: '0.23s tiles. Zero hesitation allowed.', archetype: 1 },
  { id: 93, name: 'Gatekeeper #3: Red Steel', subtitle: 'Fastest saws yet. Hope you brought reflexes.', archetype: 2 },
  { id: 94, name: 'Gatekeeper #4: Blind Faith', subtitle: 'Invisible skyway under crushing ceilings.', archetype: 3 },
  { id: 95, name: 'Gatekeeper #5: Turn Back', subtitle: 'Chapter 20 waits behind this door. Do not enter.', archetype: 4 },
];

function getExtendedChapterMeta(levelId: number): { chapter: number; chapterTitle: string; levelInChapter: number } {
  const chapter = Math.ceil(levelId / 5);
  const found = EXTENDED_CHAPTERS.find((c) => c.id === chapter);
  return {
    chapter,
    chapterTitle: found ? found.title : 'THE PEAK OF SUFFERING',
    levelInChapter: ((levelId - 1) % 5) + 1,
  };
}

/**
 * Deterministic cruel level builder for Levels 31-95.
 * Difficulty parameters tighten smoothly with levelId (t = 0..1 across 31..95),
 * while every gap (<= 182px) and step-up (<= 82px) stays mathematically crossable.
 */
function buildCruelLevel(spec: CruelLevelSpec): LevelDef {
  const { id, name, subtitle, archetype } = spec;
  const { chapter, chapterTitle, levelInChapter } = getExtendedChapterMeta(id);
  const t = Math.min(1, Math.max(0, (id - 31) / 64)); // 0 at Lv31 -> 1 at Lv95

  // Blown-up cruelty parameters (tightened across Lv 31 -> 95 while staying passable)
  const gap = Math.round(146 + t * 38); // 146 -> 184px (max flat jump ~217px)
  const narrowW = Math.round(86 - t * 24); // 86 -> 62px
  const crumbleDelay = Number((0.28 - t * 0.08).toFixed(2)); // 0.28s -> 0.20s
  const popupTelegraph = Number((0.155 - t * 0.05).toFixed(3)); // 0.155s -> 0.105s
  const sawSpeed = Number((2.55 + t * 1.1).toFixed(2)); // 2.55 -> 3.65
  const moveSpeed = Number((2.2 + t * 0.95).toFixed(2)); // 2.20 -> 3.15
  const triggerDist = Math.round(50 - t * 16); // 50 -> 34px fake drop trigger

  const platforms: PlatformDef[] = [];
  const hazards: HazardDef[] = [];
  const checkpoints: CheckpointDef[] = [];
  const signs: SignDef[] = [];
  const fakeRewards: FakeRewardDef[] = [];
  const exits: ExitDef[] = [];

  const signInsult =
    id < 50
      ? 'TRY HARDER, LOSER!'
      : id < 75
        ? 'STILL DYING?'
        : 'GIVE UP ALREADY';

  let worldWidth = 2900;
  let clueX = 1800;
  let clueY = 340;
  let clueText = 'Watch the red seams and keep your momentum!';

  if (archetype === 0) {
    // ARCHETYPE 0: Betrayal Floor & Pop-Up Ambush Gauntlet
    const x1 = 0;
    const w1 = 280;
    const xDrop1 = x1 + w1;
    const wDrop1 = 105;
    const x2 = xDrop1 + wDrop1;
    const w2 = 340;
    const xC1 = x2 + w2 + gap;
    const x3 = xC1 + narrowW + gap;
    const w3 = 440;
    const xDrop2 = x3 + w3;
    const wDrop2 = 110;
    const x4 = xDrop2 + wDrop2;
    const w4 = 380;
    const xInv = x4 + w4 + gap;
    const x5 = xInv + narrowW + gap;
    const w5 = 560;
    worldWidth = x5 + w5;

    platforms.push(
      { id: 'p1', x: x1, y: 420, w: w1, h: 140, kind: 'solid' },
      { id: 'fd1', x: xDrop1, y: 420, w: wDrop1, h: 140, kind: 'fake_drop', triggerDist, dropDistance: 240 },
      { id: 'p2', x: x2, y: 420, w: w2, h: 140, kind: 'solid' },
      { id: 'c1', x: xC1, y: 385, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.75 },
      { id: 'p3', x: x3, y: 410, w: w3, h: 150, kind: 'solid' },
      { id: 'fd2', x: xDrop2, y: 410, w: wDrop2, h: 150, kind: 'fake_drop', triggerDist, dropDistance: 240 },
      { id: 'p4', x: x4, y: 410, w: w4, h: 150, kind: 'solid' },
      { id: 'inv1', x: xInv, y: 375, w: narrowW, h: 22, kind: 'invisible' },
      { id: 'p5', x: x5, y: 410, w: w5, h: 150, kind: 'solid' },
    );

    hazards.push(
      { id: 'ps1', x: x2 + 125, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: x2 + 108, triggerRadius: 65, telegraphTime: popupTelegraph },
      { id: 'saw1', x: x3 + 185, y: 386, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: sawSpeed },
      { id: 'fb1', x: x4 + 135, y: 120, w: 66, h: 52, kind: 'falling_block', fallTriggerX: x4 + 92 },
      { id: 'ps2', x: x5 + 115, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: x5 + 95, triggerRadius: 66, telegraphTime: popupTelegraph },
      { id: 'ps3', x: x5 + 295, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: x5 + 275, triggerRadius: 66, telegraphTime: popupTelegraph },
      { id: 'ad_camp', x: x3 + 60, y: 382, w: 30, h: 30, kind: 'sweeper', moveX: 165, moveY: 0, speed: 1.85 + t * 0.5, adaptiveCondition: 'camper' },
    );

    checkpoints.push(
      { id: 'cp_fake', x: x2 + 265, y: 420, fake: true, fakeBehavior: 'collapse', fakeMessage: 'Checkpoint laughed at you.' },
      { id: 'cp_real', x: x4 + 45, y: 410, fake: false },
    );

    signs.push(
      { id: 's1', x: 165, y: 420, text: `LV ${id} · SOLID FLOOR`, flippedText: signInsult },
      { id: 's2', x: x5 + 65, y: 410, text: 'SAFE RUNWAY →', flippedText: 'LIAR!' },
    );

    fakeRewards.push({
      id: 'r1',
      x: x3 + 290,
      y: 315,
      kind: 'coin',
      prankMessage: 'WORTHLESS. JUST LIKE THAT JUMP.',
      triggersBounce: true,
    });

    exits.push({
      id: 'e1',
      x: x5 + 235,
      y: 410,
      triggerDistance: 95,
      moveTargets: [{ x: x5 + 455, y: 410, quip: 'Catch me, idiot!' }],
    });

    clueX = x5 + 90;
    clueY = 340;
    clueText = 'Two pop-up seams wait along the final sprint!';
  } else if (archetype === 1) {
    // ARCHETYPE 1: Crumble Skyway & Moving-Platform Nightmare
    const x1 = 0;
    const w1 = 260;
    const c1x = w1 + gap - 8;
    const c2x = c1x + narrowW + gap - 6;
    const c3x = c2x + narrowW + gap - 6;
    const xMid = c3x + narrowW + gap - 8;
    const wMid = 340;
    const m1x = xMid + wMid + 135;
    const c4x = m1x + 195 + gap - 10;
    const c5x = c4x + narrowW + gap - 8;
    const xEnd = c5x + narrowW + gap - 10;
    const wEnd = 480;
    worldWidth = xEnd + wEnd;

    platforms.push(
      { id: 'p1', x: x1, y: 420, w: w1, h: 140, kind: 'solid' },
      { id: 'c1', x: c1x, y: 390, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.65 },
      { id: 'c2', x: c2x, y: 350, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.65 },
      { id: 'c3', x: c3x, y: 325, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.65 },
      { id: 'pmid', x: xMid, y: 400, w: wMid, h: 160, kind: 'solid' },
      { id: 'm1', x: m1x, y: 380, w: Math.max(76, narrowW + 6), h: 22, kind: 'moving', moveX: 82, moveY: 0, speed: moveSpeed },
      { id: 'c4', x: c4x, y: 355, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.65 },
      { id: 'c5', x: c5x, y: 385, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.65 },
      { id: 'pend', x: xEnd, y: 410, w: wEnd, h: 150, kind: 'solid' },
    );

    hazards.push(
      { id: 'saw1', x: c2x + narrowW + Math.round(gap * 0.45), y: 295, w: 34, h: 34, kind: 'saw', moveX: 0, moveY: 75, speed: sawSpeed },
      { id: 'ps1', x: xMid + 145, y: 376, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: xMid + 125, triggerRadius: 65, telegraphTime: popupTelegraph },
      { id: 'saw2', x: c4x + narrowW + Math.round(gap * 0.45), y: 325, w: 34, h: 34, kind: 'saw', moveX: 0, moveY: 82, speed: sawSpeed + 0.15, phase: 1.2 },
      { id: 'fb1', x: xEnd + 145, y: 120, w: 66, h: 52, kind: 'falling_block', fallTriggerX: xEnd + 100 },
      { id: 'ps2', x: xEnd + 275, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: xEnd + 255, triggerRadius: 65, telegraphTime: popupTelegraph },
    );

    checkpoints.push(
      { id: 'cp_real', x: xMid + 50, y: 400, fake: false },
      { id: 'cp_fake', x: xEnd + 70, y: 410, fake: true, fakeBehavior: 'fly_up', fakeMessage: 'Nice try. Finish it.' },
    );

    signs.push(
      { id: 's1', x: 150, y: 420, text: `${crumbleDelay}s FLOOR. MOVE.`, flippedText: signInsult },
    );

    exits.push({ id: 'e1', x: xEnd + 390, y: 410 });
    clueX = xMid + 120;
    clueY = 330;
    clueText = 'Never stop running across crumble chains!';
  } else if (archetype === 2) {
    // ARCHETYPE 2: Low-Spike Ceiling & Buzzsaw Slaughterhouse
    const x1 = 0;
    const w1 = 680;
    const x2 = w1 + gap;
    const w2 = 520;
    const m1x = x2 + w2 + 125;
    const x3 = m1x + 190 + gap - 10;
    const w3 = 540;
    const c1x = x3 + w3 + gap - 10;
    const x4 = c1x + narrowW + gap - 10;
    const w4 = 480;
    worldWidth = x4 + w4;

    platforms.push(
      { id: 'p1', x: x1, y: 420, w: w1, h: 140, kind: 'solid' },
      { id: 'ceil1', x: 240, y: 266, w: 370, h: 24, kind: 'solid' },
      { id: 'p2', x: x2, y: 420, w: w2, h: 140, kind: 'solid' },
      { id: 'm1', x: m1x, y: 390, w: Math.max(78, narrowW + 8), h: 22, kind: 'moving', moveX: 78, moveY: 0, speed: moveSpeed },
      { id: 'p3', x: x3, y: 410, w: w3, h: 150, kind: 'solid' },
      { id: 'ceil2', x: x3 + 125, y: 260, w: 320, h: 24, kind: 'solid' },
      { id: 'c1', x: c1x, y: 385, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.7 },
      { id: 'p4', x: x4, y: 410, w: w4, h: 150, kind: 'solid' },
    );

    hazards.push(
      { id: 'hc1', x: 255, y: 290, w: 340, h: 22, kind: 'spike', dir: 'down' },
      { id: 'sp1', x: 350, y: 396, w: 38, h: 24, kind: 'spike', dir: 'up' },
      { id: 'sp2', x: 515, y: 396, w: 38, h: 24, kind: 'spike', dir: 'up' },
      { id: 'saw1', x: x2 + 135, y: 395, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 96, speed: sawSpeed },
      { id: 'saw2', x: x2 + 345, y: 395, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 96, speed: sawSpeed + 0.15, phase: 1.55 },
      { id: 'hc2', x: x3 + 140, y: 284, w: 290, h: 22, kind: 'spike', dir: 'down' },
      { id: 'ps1', x: x3 + 255, y: 386, w: 44, h: 24, kind: 'popup_spike', dir: 'up', triggerX: x3 + 235, triggerRadius: 64, telegraphTime: popupTelegraph },
      { id: 'saw3', x: x4 + 165, y: 385, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 92, speed: sawSpeed + 0.25 },
      { id: 'fb1', x: x4 + 280, y: 120, w: 66, h: 52, kind: 'falling_block', fallTriggerX: x4 + 235 },
    );

    checkpoints.push(
      { id: 'cp_real', x: x3 + 48, y: 410, fake: false },
    );

    signs.push(
      { id: 's1', x: 145, y: 420, text: 'TAP JUMP. DO NOT HOLD.', flippedText: signInsult },
    );

    exits.push({ id: 'e1', x: x4 + 400, y: 410 });
    clueX = 220;
    clueY = 355;
    clueText = 'Short-hop the spikes so you do not kiss the ceiling!';
  } else if (archetype === 3) {
    // ARCHETYPE 3: Invisible Path + Falling Crusher Ambush
    const x1 = 0;
    const w1 = 270;
    const i1x = w1 + gap - 10;
    const c1x = i1x + narrowW + gap - 10;
    const i2x = c1x + narrowW + gap - 10;
    const xMid = i2x + narrowW + gap - 10;
    const wMid = 430;
    const i3x = xMid + wMid + gap - 10;
    const c2x = i3x + narrowW + gap - 10;
    const xEnd = c2x + narrowW + gap - 10;
    const wEnd = 520;
    worldWidth = xEnd + wEnd;

    platforms.push(
      { id: 'p1', x: x1, y: 420, w: w1, h: 140, kind: 'solid' },
      { id: 'inv1', x: i1x, y: 390, w: narrowW, h: 22, kind: 'invisible' },
      { id: 'c1', x: c1x, y: 360, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.65 },
      { id: 'inv2', x: i2x, y: 335, w: narrowW, h: 22, kind: 'invisible' },
      { id: 'pmid', x: xMid, y: 405, w: wMid, h: 155, kind: 'solid' },
      { id: 'inv3', x: i3x, y: 375, w: narrowW, h: 22, kind: 'invisible' },
      { id: 'c2', x: c2x, y: 350, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.65 },
      { id: 'pend', x: xEnd, y: 410, w: wEnd, h: 150, kind: 'solid' },
    );

    hazards.push(
      { id: 'saw1', x: c1x + narrowW + Math.round(gap * 0.42), y: 295, w: 34, h: 34, kind: 'saw', moveX: 0, moveY: 74, speed: sawSpeed },
      { id: 'fb1', x: xMid + 130, y: 120, w: 66, h: 52, kind: 'falling_block', fallTriggerX: xMid + 85 },
      { id: 'fb2', x: xMid + 275, y: 120, w: 66, h: 52, kind: 'falling_block', fallTriggerX: xMid + 230 },
      { id: 'ps1', x: xEnd + 135, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: xEnd + 115, triggerRadius: 65, telegraphTime: popupTelegraph },
      { id: 'saw2', x: xEnd + 290, y: 386, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 92, speed: sawSpeed + 0.2 },
    );

    checkpoints.push(
      { id: 'cp_real', x: xMid + 48, y: 405, fake: false },
    );

    signs.push(
      { id: 's1', x: 160, y: 420, text: 'LOOK FOR FAINT DOTS', flippedText: signInsult },
    );

    fakeRewards.push({
      id: 'r1',
      x: i2x + narrowW / 2,
      y: 265,
      kind: 'star',
      prankMessage: 'STAR OF SHAME EARNED.',
    });

    exits.push({ id: 'e1', x: xEnd + 425, y: 410 });
    clueX = i1x + 15;
    clueY = 330;
    clueText = 'Invisible ledges glimmer faintly right at the rim!';
  } else {
    // ARCHETYPE 4: Fake Exit + Reveal Wall + Chasing Door Boss Stage
    const x1 = 0;
    const w1 = 290;
    const c1x = w1 + gap - 10;
    const i1x = c1x + narrowW + gap - 10;
    const xMid = i1x + narrowW + gap - 10;
    const wMid = 440;
    const wallX = xMid + wMid - 40;
    const x3 = xMid + wMid;
    const w3 = 290;
    const m1x = x3 + w3 + 130;
    const c2x = m1x + 190 + gap - 10;
    const xEnd = c2x + narrowW + gap - 10;
    const wEnd = 590;
    const triggerId = `reveal_lvl_${id}`;
    worldWidth = xEnd + wEnd;

    platforms.push(
      { id: 'p1', x: x1, y: 420, w: w1, h: 140, kind: 'solid' },
      { id: 'c1', x: c1x, y: 390, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.65 },
      { id: 'inv1', x: i1x, y: 360, w: narrowW, h: 22, kind: 'invisible' },
      { id: 'pmid', x: xMid, y: 410, w: wMid, h: 150, kind: 'solid' },
      { id: 'wall', x: wallX, y: 110, w: 40, h: 300, kind: 'reveal_wall', linkedTriggerId: triggerId },
      { id: 'p3', x: x3, y: 410, w: w3, h: 150, kind: 'solid' },
      { id: 'm1', x: m1x, y: 385, w: Math.max(76, narrowW + 6), h: 22, kind: 'moving', moveX: 84, moveY: 0, speed: moveSpeed },
      { id: 'c2', x: c2x, y: 365, w: narrowW, h: 22, kind: 'crumble', crumbleDelay, respawnDelay: 1.65 },
      { id: 'pend', x: xEnd, y: 410, w: wEnd, h: 150, kind: 'solid' },
    );

    hazards.push(
      { id: 'saw1', x: xMid + 150, y: 388, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 94, speed: sawSpeed },
      { id: 'ad_camp', x: xMid + 45, y: 382, w: 30, h: 30, kind: 'sweeper', moveX: 185, moveY: 0, speed: 1.9 + t * 0.5, adaptiveCondition: 'camper' },
      { id: 'fb1', x: x3 + 155, y: 120, w: 66, h: 52, kind: 'falling_block', fallTriggerX: x3 + 110 },
      { id: 'ps1', x: xEnd + 95, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: xEnd + 75, triggerRadius: 65, telegraphTime: popupTelegraph },
      { id: 'ps2', x: xEnd + 270, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: xEnd + 250, triggerRadius: 65, telegraphTime: popupTelegraph },
    );

    checkpoints.push(
      { id: 'cp_fake', x: 220, y: 420, fake: true, fakeBehavior: 'run_away', fakeMessage: 'Checkpoint fled in disgust.' },
      { id: 'cp_real', x: x3 + 52, y: 410, fake: false },
    );

    signs.push(
      { id: 's1', x: 145, y: 420, text: `LEVEL ${id}`, flippedText: signInsult },
      { id: 's2', x: xMid + 275, y: 410, text: 'YOU WIN!', flippedText: 'SIKE! KEEP GOING.' },
    );

    fakeRewards.push({
      id: 'r1',
      x: xEnd + 185,
      y: 325,
      kind: 'trophy',
      prankMessage: 'NO TROPHY FOR IDIOTS.',
      triggersBounce: true,
    });

    exits.push(
      {
        id: 'e_fake',
        x: xMid + 340,
        y: 410,
        fake: true,
        fakeMessage: 'FAKE DOOR! WALL OPENED — RUN!',
        revealsTriggerId: triggerId,
      },
      {
        id: 'e_real',
        x: xEnd + 195,
        y: 410,
        triggerDistance: 95,
        moveTargets: [
          { x: xEnd + 365, y: 410, quip: 'Too slow!' },
          { x: xEnd + 505, y: 410, quip: 'Barely.' },
        ],
      },
    );

    clueX = xEnd + 65;
    clueY = 340;
    clueText = 'Jump BOTH pop-up seams while chasing the sprinting door!';
  }

  return {
    id,
    chapter,
    chapterTitle,
    levelInChapter,
    name,
    subtitle,
    worldWidth,
    worldHeight: 540,
    spawn: { x: 65, y: 370 },
    platforms,
    hazards,
    checkpoints,
    signs,
    fakeRewards,
    exits,
    adaptiveClue: { x: clueX, y: clueY, text: clueText },
  };
}

/**
 * CHAPTER 20: THE PEAK OF SUFFERING (Levels 96 - 100)
 * Handcrafted endgame nightmares:
 * - 96-98: Cruel pre-boss trials
 * - 99: Almost impossible gatekeeper before 100 (brutally tight, yet 100% passable!)
 * - 100: Literally almost impossible peak gauntlet — zero real checkpoints, double fake exits,
 *        0.21s crumble slabs, blind invisible bridges, 3.65x saws, 0.11s pop-ups, and 198px
 *        max-momentum edge jumps. Beating 100 is certified ABSOLUTE PEAK.
 */
const CHAPTER_20_LEVELS: LevelDef[] = [
  {
    id: 96,
    chapter: 20,
    chapterTitle: 'THE PEAK OF SUFFERING',
    levelInChapter: 1,
    name: 'Abandon Hope, Idiot',
    subtitle: 'Chapter 20 begins. Leave your self-esteem at the entrance.',
    worldWidth: 3340,
    worldHeight: 540,
    spawn: { x: 65, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 250, h: 140, kind: 'solid' },
      { id: 'c1', x: 430, y: 390, w: 68, h: 22, kind: 'crumble', crumbleDelay: 0.23, respawnDelay: 1.6 },
      { id: 'inv1', x: 678, y: 355, w: 68, h: 22, kind: 'invisible' },
      { id: 'c2', x: 926, y: 325, w: 68, h: 22, kind: 'crumble', crumbleDelay: 0.23, respawnDelay: 1.6 },
      { id: 'p2', x: 1175, y: 405, w: 460, h: 155, kind: 'solid' },
      { id: 'ceil1', x: 1260, y: 258, w: 290, h: 24, kind: 'solid' },
      { id: 'm1', x: 1775, y: 380, w: 76, h: 22, kind: 'moving', moveX: 86, moveY: 0, speed: 2.95 },
      { id: 'c3', x: 2045, y: 355, w: 68, h: 22, kind: 'crumble', crumbleDelay: 0.23, respawnDelay: 1.6 },
      { id: 'inv2', x: 2295, y: 335, w: 68, h: 22, kind: 'invisible' },
      { id: 'p3', x: 2545, y: 410, w: 795, h: 150, kind: 'solid' },
    ],
    hazards: [
      { id: 'saw1', x: 565, y: 310, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 82, speed: 3.1 },
      { id: 'hc1', x: 1275, y: 282, w: 260, h: 22, kind: 'spike', dir: 'down' },
      { id: 'sp1', x: 1385, y: 381, w: 40, h: 24, kind: 'spike', dir: 'up' },
      { id: 'saw2', x: 2175, y: 300, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 85, speed: 3.25 },
      { id: 'fb1', x: 2690, y: 115, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 2640 },
      { id: 'ps1', x: 2855, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2835, triggerRadius: 65, telegraphTime: 0.12 },
      { id: 'ps2', x: 3045, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 3025, triggerRadius: 65, telegraphTime: 0.12 },
    ],
    checkpoints: [
      { id: 'cp_fake', x: 200, y: 420, fake: true, fakeBehavior: 'collapse', fakeMessage: 'Not in Chapter 20.' },
      { id: 'cp_real', x: 1210, y: 405, fake: false },
    ],
    signs: [
      { id: 's1', x: 135, y: 420, text: 'CH.20 · NO MERCY', flippedText: 'CRY ABOUT IT' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e1',
        x: 2950,
        y: 410,
        triggerDistance: 95,
        moveTargets: [{ x: 3220, y: 410, quip: '4 levels left...' }],
      },
    ],
    adaptiveClue: { x: 2800, y: 340, text: 'Two ultra-fast pop-up seams guard the door!' },
  },

  {
    id: 97,
    chapter: 20,
    chapterTitle: 'THE PEAK OF SUFFERING',
    levelInChapter: 2,
    name: 'Pixel-Perfect Purgatory',
    subtitle: 'One bad frame and we send you straight back.',
    worldWidth: 3460,
    worldHeight: 540,
    spawn: { x: 65, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 240, h: 140, kind: 'solid' },
      { id: 'fd1', x: 240, y: 420, w: 110, h: 140, kind: 'fake_drop', triggerDist: 38, dropDistance: 240 },
      { id: 'p2', x: 350, y: 420, w: 340, h: 140, kind: 'solid' },
      { id: 'c1', x: 870, y: 390, w: 66, h: 22, kind: 'crumble', crumbleDelay: 0.23, respawnDelay: 1.55 },
      { id: 'c2', x: 1118, y: 355, w: 66, h: 22, kind: 'crumble', crumbleDelay: 0.23, respawnDelay: 1.55 },
      { id: 'p3', x: 1365, y: 405, w: 500, h: 155, kind: 'solid' },
      { id: 'wall97', x: 1825, y: 105, w: 40, h: 300, kind: 'reveal_wall', linkedTriggerId: 'purg_97' },
      { id: 'p4', x: 1865, y: 405, w: 280, h: 155, kind: 'solid' },
      { id: 'inv1', x: 2325, y: 375, w: 66, h: 22, kind: 'invisible' },
      { id: 'c3', x: 2575, y: 345, w: 66, h: 22, kind: 'crumble', crumbleDelay: 0.23, respawnDelay: 1.55 },
      { id: 'p5', x: 2825, y: 410, w: 635, h: 150, kind: 'solid' },
    ],
    hazards: [
      { id: 'ps1', x: 460, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 440, triggerRadius: 65, telegraphTime: 0.12 },
      { id: 'saw1', x: 1005, y: 315, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 85, speed: 3.25 },
      { id: 'saw2', x: 1530, y: 382, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 94, speed: 3.3 },
      { id: 'fb1', x: 2010, y: 115, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1965 },
      { id: 'saw3', x: 2460, y: 310, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 86, speed: 3.35 },
      { id: 'ps2', x: 2945, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2925, triggerRadius: 65, telegraphTime: 0.12 },
      { id: 'ps3', x: 3130, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 3110, triggerRadius: 65, telegraphTime: 0.12 },
    ],
    checkpoints: [
      { id: 'cp_real', x: 1910, y: 405, fake: false },
    ],
    signs: [
      { id: 's1', x: 140, y: 420, text: 'LV 97 · GOOD LUCK', flippedText: 'YOU WILL NEED IT' },
    ],
    fakeRewards: [
      { id: 'r1', x: 3035, y: 315, kind: 'trophy', prankMessage: 'STILL NOT WORTHY.', triggersBounce: true },
    ],
    exits: [
      { id: 'e_fake', x: 1745, y: 405, fake: true, fakeMessage: 'FALSE FINISH! KEEP MOVING!', revealsTriggerId: 'purg_97' },
      {
        id: 'e_real',
        x: 3045,
        y: 410,
        triggerDistance: 95,
        moveTargets: [{ x: 3330, y: 410, quip: '98 awaits, idiot!' }],
      },
    ],
    adaptiveClue: { x: 2900, y: 340, text: 'Do NOT touch the trophy — leap both red seams!' },
  },

  {
    id: 98,
    chapter: 20,
    chapterTitle: 'THE PEAK OF SUFFERING',
    levelInChapter: 3,
    name: 'Your Fingers Are Begging',
    subtitle: 'Two steps from 100. Everything here wants your head.',
    worldWidth: 3620,
    worldHeight: 540,
    spawn: { x: 65, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 230, h: 140, kind: 'solid' },
      { id: 'b1', x: 390, y: 425, w: 72, h: 20, kind: 'bounce' },
      { id: 'ceil_trap', x: 340, y: 185, w: 180, h: 24, kind: 'solid' },
      { id: 'c1', x: 625, y: 320, w: 66, h: 22, kind: 'crumble', crumbleDelay: 0.22, respawnDelay: 1.55 },
      { id: 'inv1', x: 875, y: 340, w: 66, h: 22, kind: 'invisible' },
      { id: 'p2', x: 1125, y: 410, w: 530, h: 150, kind: 'solid' },
      { id: 'ceil2', x: 1215, y: 260, w: 350, h: 24, kind: 'solid' },
      { id: 'm1', x: 1805, y: 385, w: 74, h: 22, kind: 'moving', moveX: 88, moveY: 0, speed: 3.1 },
      { id: 'c2', x: 2075, y: 355, w: 64, h: 22, kind: 'crumble', crumbleDelay: 0.22, respawnDelay: 1.55 },
      { id: 'c3', x: 2325, y: 330, w: 64, h: 22, kind: 'crumble', crumbleDelay: 0.22, respawnDelay: 1.55 },
      { id: 'inv2', x: 2575, y: 365, w: 64, h: 22, kind: 'invisible' },
      { id: 'p3', x: 2825, y: 410, w: 795, h: 150, kind: 'solid' },
    ],
    hazards: [
      { id: 'hc1', x: 355, y: 209, w: 150, h: 22, kind: 'spike', dir: 'down' },
      { id: 'hc2', x: 1230, y: 284, w: 320, h: 22, kind: 'spike', dir: 'down' },
      { id: 'sp1', x: 1320, y: 386, w: 38, h: 24, kind: 'spike', dir: 'up' },
      { id: 'sp2', x: 1475, y: 386, w: 38, h: 24, kind: 'spike', dir: 'up' },
      { id: 'saw1', x: 2205, y: 295, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 85, speed: 3.35 },
      { id: 'fb1', x: 2965, y: 115, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 2920 },
      { id: 'fb2', x: 3130, y: 115, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 3085 },
      { id: 'ps1', x: 3285, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 3265, triggerRadius: 65, telegraphTime: 0.115 },
    ],
    checkpoints: [
      { id: 'cp_real', x: 1165, y: 410, fake: false },
      { id: 'cp_fake', x: 2885, y: 410, fake: true, fakeBehavior: 'run_away', fakeMessage: 'Earn Level 99 yourself!' },
    ],
    signs: [
      { id: 's1', x: 130, y: 420, text: 'BOUNCE RIGHT — FAST', flippedText: 'OUCH' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e1',
        x: 3395,
        y: 410,
        triggerDistance: 95,
        moveTargets: [{ x: 3525, y: 410, quip: 'Now face Level 99...' }],
      },
    ],
    adaptiveClue: { x: 2930, y: 340, text: 'Bait both crushers back-to-back, then hop the seam!' },
  },

  // =========================================================================
  // LEVEL 99: ALMOST IMPOSSIBLE GATEKEEPER TO LEVEL 100
  // Brutally tough — razor-thin margins, every mechanic combined — ONLY almost impossible!
  // =========================================================================
  {
    id: 99,
    chapter: 20,
    chapterTitle: 'THE PEAK OF SUFFERING',
    levelInChapter: 4,
    name: '99%: Almost There (Choke Time)',
    subtitle: 'Almost impossible to reach 100 — but ONLY almost. Earn the right to suffer.',
    worldWidth: 4140,
    worldHeight: 540,
    spawn: { x: 60, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 215, h: 140, kind: 'solid' },
      { id: 'fd1', x: 215, y: 420, w: 110, h: 140, kind: 'fake_drop', triggerDist: 34, dropDistance: 245 },
      { id: 'p2', x: 325, y: 420, w: 235, h: 140, kind: 'solid' },
      // Razor-tight crumble-invisible-crumble staircase (gaps 186-190px)
      { id: 'c1', x: 748, y: 388, w: 60, h: 22, kind: 'crumble', crumbleDelay: 0.21, respawnDelay: 1.45 },
      { id: 'inv1', x: 998, y: 348, w: 58, h: 22, kind: 'invisible' },
      { id: 'c2', x: 1246, y: 312, w: 60, h: 22, kind: 'crumble', crumbleDelay: 0.21, respawnDelay: 1.45 },
      // Mid gauntlet with spike ceiling + sweeper + fake exit wall
      { id: 'p3', x: 1496, y: 405, w: 600, h: 155, kind: 'solid' },
      { id: 'ceil99', x: 1580, y: 254, w: 345, h: 24, kind: 'solid' },
      { id: 'wall99', x: 2056, y: 100, w: 40, h: 305, kind: 'reveal_wall', linkedTriggerId: 'gate_99' },
      // Real checkpoint island (earned after surviving half of 99!)
      { id: 'p4', x: 2096, y: 405, w: 270, h: 155, kind: 'solid' },
      // Second half: moving slab -> crumble -> invisible -> crumble -> final crusher + runaway door!
      { id: 'm1', x: 2510, y: 380, w: 68, h: 22, kind: 'moving', moveX: 90, moveY: 0, speed: 3.3 },
      { id: 'c3', x: 2782, y: 352, w: 58, h: 22, kind: 'crumble', crumbleDelay: 0.20, respawnDelay: 1.45 },
      { id: 'inv2', x: 3032, y: 320, w: 58, h: 22, kind: 'invisible' },
      { id: 'c4', x: 3282, y: 362, w: 58, h: 22, kind: 'crumble', crumbleDelay: 0.20, respawnDelay: 1.45 },
      { id: 'p5', x: 3532, y: 410, w: 608, h: 150, kind: 'solid' },
    ],
    hazards: [
      { id: 'ps0', x: 430, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 412, triggerRadius: 65, telegraphTime: 0.11 },
      { id: 'saw1', x: 882, y: 312, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: 3.45 },
      { id: 'saw2', x: 1134, y: 288, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: 3.5, phase: 1.4 },
      { id: 'hc99', x: 1595, y: 278, w: 315, h: 22, kind: 'spike', dir: 'down' },
      { id: 'sp1', x: 1685, y: 381, w: 38, h: 24, kind: 'spike', dir: 'up' },
      { id: 'sp2', x: 1825, y: 381, w: 38, h: 24, kind: 'spike', dir: 'up' },
      { id: 'sw99', x: 1530, y: 377, w: 30, h: 30, kind: 'sweeper', moveX: 240, moveY: 0, speed: 2.35 },
      { id: 'fb1', x: 2245, y: 112, w: 64, h: 52, kind: 'falling_block', fallTriggerX: 2200 },
      { id: 'saw3', x: 2912, y: 292, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 92, speed: 3.55 },
      { id: 'saw4', x: 3164, y: 292, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 92, speed: 3.6, phase: 1.5 },
      { id: 'ps1', x: 3605, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 3586, triggerRadius: 65, telegraphTime: 0.105 },
      { id: 'ps2', x: 3770, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 3751, triggerRadius: 65, telegraphTime: 0.105 },
      { id: 'ps3', x: 3935, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 3916, triggerRadius: 65, telegraphTime: 0.105 },
    ],
    checkpoints: [
      { id: 'cp_fake', x: 505, y: 420, fake: true, fakeBehavior: 'fly_up', fakeMessage: 'Checkpoint? On Level 99?! HA!' },
      { id: 'cp_real', x: 2140, y: 405, fake: false },
    ],
    signs: [
      { id: 's1', x: 120, y: 420, text: 'LEVEL 99 · SO CLOSE', flippedText: 'SO FAR, IDIOT' },
      { id: 's2', x: 1945, y: 405, text: 'TO LEVEL 100 →', flippedText: 'NOT YET!' },
    ],
    fakeRewards: [
      { id: 'r1', x: 3690, y: 308, kind: 'trophy', prankMessage: 'CHOKE ARTIST AWARD!', triggersBounce: true },
    ],
    exits: [
      { id: 'e_fake', x: 1995, y: 405, fake: true, fakeMessage: 'FAKE 99 CLEAR! HALFWAY LEFT!', revealsTriggerId: 'gate_99' },
      {
        id: 'e_real',
        x: 3700,
        y: 410,
        triggerDistance: 95,
        moveTargets: [
          { x: 3865, y: 410, quip: 'ALMOST AT 100...' },
          { x: 4055, y: 410, quip: 'FINE. ENTER HELL (100).' },
        ],
      },
    ],
    adaptiveClue: { x: 3560, y: 335, text: 'THREE instant pop-up seams guard the door — zero hesitation!' },
  },

  // =========================================================================
  // LEVEL 100: TRY AGAIN, IDIOT — LITERALLY IMPOSSIBLE (THE RARE MOMENT)
  // 5-phase 5,580px nightmare. ZERO real checkpoints (3 fake checkpoints!).
  // TRIPLE fake exits. 0.17s flash-crumbles. Blind invisible skybridges.
  // 3.85x counter-phase buzzsaws. Triple back-to-back crushers.
  // 198-202px full-momentum pixel-edge leaps. 5-stage runaway door over 4 mines.
  // Virtually no one can cross it — beating it is an ultra-rare historic moment.
  // =========================================================================
  {
    id: 100,
    chapter: 20,
    chapterTitle: 'THE PEAK OF SUFFERING',
    levelInChapter: 5,
    name: 'TRY HARDER, LOSER!: LITERALLY IMPOSSIBLE',
    subtitle: 'ZERO checkpoints. Nobody crosses 100. If you do, it is a rare moment in history.',
    worldWidth: 5580,
    worldHeight: 540,
    spawn: { x: 52, y: 370 },
    platforms: [
      // Phase 1: Immediate guillotine drop + 4-ledge 0.17s flash-crumble & invisible saw canyon
      { id: 'p1', x: 0, y: 420, w: 185, h: 140, kind: 'solid' },
      { id: 'fd1', x: 185, y: 420, w: 120, h: 140, kind: 'fake_drop', triggerDist: 32, dropDistance: 260 },
      { id: 'p2', x: 305, y: 420, w: 185, h: 140, kind: 'solid' },
      { id: 'c1', x: 688, y: 388, w: 54, h: 22, kind: 'crumble', crumbleDelay: 0.17, respawnDelay: 1.4 },
      { id: 'inv1', x: 940, y: 344, w: 52, h: 22, kind: 'invisible' },
      { id: 'c2', x: 1190, y: 304, w: 54, h: 22, kind: 'crumble', crumbleDelay: 0.17, respawnDelay: 1.4 },
      { id: 'inv2', x: 1442, y: 340, w: 52, h: 22, kind: 'invisible' },

      // Phase 2: Low-clearance spike & sweeper torture tunnel + Fake Exit #1
      { id: 'p3', x: 1692, y: 405, w: 635, h: 155, kind: 'solid' },
      { id: 'ceil100a', x: 1755, y: 250, w: 420, h: 24, kind: 'solid' },
      { id: 'wall100a', x: 2287, y: 90, w: 40, h: 315, kind: 'reveal_wall', linkedTriggerId: 'peak_100_a' },

      // Phase 3: Triple crusher gauntlet -> hyper-speed moving platforms -> invisible sky-leap
      { id: 'p4', x: 2327, y: 405, w: 420, h: 155, kind: 'solid' },
      { id: 'm1', x: 2895, y: 380, w: 62, h: 22, kind: 'moving', moveX: 92, moveY: 0, speed: 3.65 },
      { id: 'c3', x: 3165, y: 342, w: 52, h: 22, kind: 'crumble', crumbleDelay: 0.17, respawnDelay: 1.4 },
      { id: 'inv3', x: 3417, y: 308, w: 52, h: 22, kind: 'invisible' },
      { id: 'c4', x: 3669, y: 350, w: 52, h: 22, kind: 'crumble', crumbleDelay: 0.17, respawnDelay: 1.4 },

      // Phase 4: Fake Exit #2 -> Bounce Ceiling Trap -> Fake Exit #3!
      { id: 'p5', x: 3921, y: 408, w: 230, h: 152, kind: 'solid' },
      { id: 'wall100b', x: 4111, y: 90, w: 40, h: 318, kind: 'reveal_wall', linkedTriggerId: 'peak_100_b' },
      { id: 'fd2', x: 4151, y: 408, w: 96, h: 152, kind: 'fake_drop', triggerDist: 30, dropDistance: 260 },
      { id: 'c5', x: 4400, y: 375, w: 52, h: 22, kind: 'crumble', crumbleDelay: 0.17, respawnDelay: 1.4 },
      { id: 'p6', x: 4652, y: 408, w: 215, h: 152, kind: 'solid' },
      { id: 'wall100c', x: 4827, y: 90, w: 40, h: 318, kind: 'reveal_wall', linkedTriggerId: 'peak_100_c' },

      // Phase 5: Final 5-stage runaway door sprint across 4 instant pop-up mines + final crusher!
      { id: 'p7', x: 4867, y: 410, w: 713, h: 150, kind: 'solid' },
    ],
    hazards: [
      // Phase 1 instant popup + counter-phase hyper-saws
      { id: 'ps0', x: 375, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 358, triggerRadius: 68, telegraphTime: 0.095 },
      { id: 'saw1', x: 816, y: 306, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 94, speed: 3.7 },
      { id: 'saw2', x: 1068, y: 276, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 94, speed: 3.75, phase: 1.35 },
      { id: 'saw3', x: 1320, y: 292, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 94, speed: 3.8, phase: 2.5 },

      // Phase 2 razor-low torture tunnel + patrolling sweeper
      { id: 'hc100', x: 1770, y: 274, w: 390, h: 22, kind: 'spike', dir: 'down' },
      { id: 'sp1', x: 1835, y: 381, w: 38, h: 24, kind: 'spike', dir: 'up' },
      { id: 'sp2', x: 1960, y: 381, w: 38, h: 24, kind: 'spike', dir: 'up' },
      { id: 'sp3', x: 2085, y: 381, w: 38, h: 24, kind: 'spike', dir: 'up' },
      { id: 'sw1', x: 1720, y: 377, w: 30, h: 30, kind: 'sweeper', moveX: 320, moveY: 0, speed: 2.75 },

      // Phase 3 triple concrete crushers + hyper-speed twin saws
      { id: 'fb1', x: 2410, y: 105, w: 62, h: 52, kind: 'falling_block', fallTriggerX: 2368 },
      { id: 'fb2', x: 2530, y: 105, w: 62, h: 52, kind: 'falling_block', fallTriggerX: 2488 },
      { id: 'fb3', x: 2650, y: 105, w: 62, h: 52, kind: 'falling_block', fallTriggerX: 2608 },
      { id: 'saw4', x: 3294, y: 276, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 96, speed: 3.8 },
      { id: 'saw5', x: 3546, y: 288, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 96, speed: 3.85, phase: 1.6 },

      // Phase 4 sky saw over crumble leap
      { id: 'saw6', x: 4526, y: 320, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 96, speed: 3.85 },

      // Phase 5 4-mine pop-up gauntlet + final crusher + sweeper!
      { id: 'ps1', x: 4935, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 4918, triggerRadius: 68, telegraphTime: 0.095 },
      { id: 'ps2', x: 5065, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 5048, triggerRadius: 68, telegraphTime: 0.095 },
      { id: 'ps3', x: 5195, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 5178, triggerRadius: 68, telegraphTime: 0.095 },
      { id: 'ps4', x: 5325, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 5308, triggerRadius: 68, telegraphTime: 0.095 },
      { id: 'fb4', x: 5420, y: 105, w: 62, h: 52, kind: 'falling_block', fallTriggerX: 5378 },
    ],
    // ZERO REAL CHECKPOINTS ON LEVEL 100 — THREE FAKE ONES TO CRUSH YOUR SOUL!
    checkpoints: [
      { id: 'cp_fake1', x: 1735, y: 405, fake: true, fakeBehavior: 'collapse', fakeMessage: 'ZERO CHECKPOINTS ON 100, IDIOT!' },
      { id: 'cp_fake2', x: 2365, y: 405, fake: true, fakeBehavior: 'fly_up', fakeMessage: 'STILL NO CHECKPOINT! KEEP SUFFERING!' },
      { id: 'cp_fake3', x: 4700, y: 408, fake: true, fakeBehavior: 'run_away', fakeMessage: 'ALMOST AT THE END — DIE AND RESTART FROM PIXEL 1!' },
    ],
    signs: [
      { id: 's1', x: 100, y: 420, text: 'LEVEL 100 · IMPOSSIBLE', flippedText: 'NOBODY CROSSES THIS' },
      { id: 's2', x: 2175, y: 405, text: 'THE END!', flippedText: 'BETRAYAL #1 OF 3!' },
      { id: 's3', x: 3995, y: 408, text: 'FINALLY!', flippedText: 'BETRAYAL #2! JUMP!' },
      { id: 's4', x: 4735, y: 408, text: 'FOR REAL!', flippedText: 'BETRAYAL #3! SPRINT!' },
    ],
    fakeRewards: [
      { id: 'r1', x: 5130, y: 298, kind: 'trophy', prankMessage: 'GREED JUST ENDED YOUR RUN, IDIOT!', triggersBounce: true },
    ],
    exits: [
      {
        id: 'e_fake1',
        x: 2230,
        y: 405,
        fake: true,
        fakeMessage: 'BETRAYAL #1! WALL OPENED — SURVIVE THE CRUSHERS!',
        revealsTriggerId: 'peak_100_a',
      },
      {
        id: 'e_fake2',
        x: 4058,
        y: 408,
        fake: true,
        fakeMessage: 'BETRAYAL #2! FULL-SPEED JUMP OVER THE DROP!',
        revealsTriggerId: 'peak_100_b',
      },
      {
        id: 'e_fake3',
        x: 4778,
        y: 408,
        fake: true,
        fakeMessage: 'BETRAYAL #3! FINAL MINEFIELD — DO NOT CHOKE!',
        revealsTriggerId: 'peak_100_c',
      },
      {
        id: 'e_real',
        x: 5005,
        y: 410,
        triggerDistance: 92,
        moveTargets: [
          { x: 5135, y: 410, quip: 'NO WAY...' },
          { x: 5265, y: 410, quip: 'STOP!! NOBODY BEATS 100!!' },
          { x: 5395, y: 410, quip: 'BAIT THE CRUSHER!!' },
          { x: 5515, y: 410, quip: 'RARE MOMENT. ABSOLUTE PEAK.' },
        ],
      },
    ],
    adaptiveClue: {
      x: 4895,
      y: 335,
      text: 'FOUR instant mines + final crusher — frame-perfect run for history!',
    },
  },
];

export const EXTENDED_LEVELS: LevelDef[] = [
  ...CRUEL_SPECS_31_TO_95.map(buildCruelLevel),
  ...CHAPTER_20_LEVELS,
];
