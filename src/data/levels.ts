import type { LevelDef } from '../types/game';
import { EXTENDED_CHAPTERS, EXTENDED_LEVELS } from './levelsExtended';
import { buildLevel100Finale } from './level100';

/**
 * 100 Handcrafted & Distinct Ragebait Levels across 20 Chapters.
 * World reference: viewport logical height = 540px, standard ground y = 420.
 * Verified physics envelope (normal gravity): max jump height ~108.5px, max flat jump ~217px.
 * Every single level introduces its own original ragebait concept, and fake-exit levels
 * lock the camera and hide the newly revealed track completely with zero spoilers.
 */
export const CHAPTERS = [
  { id: 1, title: 'The Beginning', subtitle: 'Easy, deceptive. Warm-ups with sharp teeth.' },
  { id: 2, title: 'The Beginning II', subtitle: 'Fake walls, hidden treadmills, and low-gravity tricks.' },
  { id: 3, title: 'The Trap', subtitle: 'Easy–Medium. Dodging ledges, ghost steps, and flipped minds.' },
  { id: 4, title: 'The Trap II', subtitle: 'Trap lifts, pitch-black darkness, and relentless saws.' },
  { id: 5, title: 'The Deception', subtitle: 'Medium. Heavy gravity, sliding blades, and fake safety.' },
  { id: 6, title: 'The Deception II', subtitle: 'Gale winds, pitch-dark chases, and zero-spoiler betrayals.' },
  ...EXTENDED_CHAPTERS,
] as const;

const CORE_LEVELS: LevelDef[] = [
  // =========================================================================
  // CHAPTER 1: TRUST ISSUES (Levels 01 - 05)
  // =========================================================================
  {
    // CONCEPT 1: Classic false-security onboarding — lying "100% Solid Floor" hairline seam
    id: 1,
    chapter: 1,
    chapterTitle: 'The Introduction',
    levelInChapter: 1,
    name: 'Even a Pigeon Beats This',
    subtitle: 'Just walk right. Try not to embarrass yourself already.',
    worldWidth: 1420,
    worldHeight: 540,
    spawn: { x: 80, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 420, h: 140, kind: 'solid' },
      { id: 'p2', x: 530, y: 420, w: 280, h: 140, kind: 'solid' },
      { id: 'p_drop', x: 810, y: 420, w: 100, h: 140, kind: 'fake_drop', triggerDist: 45, dropDistance: 220 },
      { id: 'p3', x: 910, y: 420, w: 510, h: 140, kind: 'solid' },
    ],
    hazards: [],
    checkpoints: [],
    signs: [
      { id: 's1', x: 190, y: 420, text: 'Walk Right →' },
      { id: 's2', x: 380, y: 420, text: 'Jump Over ↑' },
      { id: 's3', x: 860, y: 420, text: '100% Solid Floor', flippedText: '98% Solid Floor' },
      { id: 's4', x: 1120, y: 420, text: 'Touch The Door →' },
    ],
    fakeRewards: [],
    exits: [{ id: 'e1', x: 1265, y: 420 }],
    tutorialHints: [
      {
        id: 'l1_gap',
        minX: 380,
        maxX: 545,
        x: 475,
        y: 344,
        text: 'Hold Jump longer for a full leap.',
        minDeaths: 2,
      },
      {
        id: 'l1_seam_drop',
        minX: 745,
        maxX: 945,
        x: 845,
        y: 334,
        text: 'That sign lied — jump right before the sign!',
        minDeaths: 2,
      },
    ],
    adaptiveClue: { x: 760, y: 355, text: 'Jump early before the sign!' },
  },

  {
    // CONCEPT 2: Psychological reversal of Level 1 (marked tile is solid decoy, seamless neighbor shatters on landing)
    id: 2,
    chapter: 1,
    chapterTitle: 'The Introduction',
    levelInChapter: 2,
    name: 'Ooh, Shiny! (Idiot)',
    subtitle: 'If it sparkles, you will definitely touch it.',
    worldWidth: 1760,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 360, h: 140, kind: 'solid' },
      { id: 'p2', x: 475, y: 420, w: 260, h: 140, kind: 'solid' },
      { id: 'p_high', x: 540, y: 335, w: 120, h: 20, kind: 'solid' },
      { id: 'p_decoy_solid', x: 735, y: 420, w: 100, h: 140, kind: 'solid', fakeSeamDecoy: true },
      { id: 'p3', x: 980, y: 420, w: 780, h: 140, kind: 'solid' },
      {
        id: 'p_real_drop',
        x: 835,
        y: 420,
        w: 145,
        h: 140,
        kind: 'fake_drop',
        hideSeam: true,
        triggerOnLandingOnly: true,
        dropDistance: 220,
        prankMessage: 'HAHA! THAT ONE WAS 100% SOLID — THE NEXT TILE WASN’T!',
      },
      { id: 'p_ceil', x: 1165, y: 268, w: 220, h: 26, kind: 'solid' },
    ],
    hazards: [
      { id: 'h1', x: 1185, y: 294, w: 180, h: 22, kind: 'spike', dir: 'down' },
      { id: 'h2', x: 1460, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1440, triggerRadius: 65, telegraphTime: 0.22 },
    ],
    checkpoints: [],
    signs: [
      { id: 's1', x: 595, y: 335, text: 'FREE BONUS', flippedText: 'GULLIBLE' },
      {
        id: 's_floor',
        x: 785,
        y: 420,
        text: '100% Solid Floor',
        flippedText: 'Actually Solid! (Next Tile Wasn’t)',
      },
      { id: 's2', x: 1135, y: 420, text: 'JUMP HIGH! ↑', flippedText: 'Or just walk.' },
    ],
    fakeRewards: [
      { id: 'r1', x: 600, y: 295, kind: 'trophy', prankMessage: '+0 POINTS! NICE TRY.', triggersBounce: true },
    ],
    exits: [{ id: 'e1', x: 1640, y: 420 }],
    tutorialHints: [
      {
        id: 'l2_gap',
        minX: 325,
        maxX: 495,
        x: 418,
        y: 344,
        text: 'Build running speed before jumping the gap.',
        minDeaths: 2,
      },
      {
        id: 'l2_fake_break',
        minX: 720,
        maxX: 1010,
        x: 855,
        y: 332,
        text: 'The sign tile is solid — jump the floor RIGHT after it.',
        minDeaths: 2,
      },
      {
        id: 'l2_ceil_spikes',
        minX: 1120,
        maxX: 1405,
        x: 1265,
        y: 356,
        text: 'Ignore the sign — just walk underneath.',
        minDeaths: 2,
        causes: ['spike'],
      },
      {
        id: 'l2_popup_spike',
        minX: 1405,
        maxX: 1565,
        x: 1480,
        y: 336,
        text: 'Bait the hidden spike, or hop over early.',
        minDeaths: 2,
        causes: ['popup_spike'],
      },
    ],
    adaptiveClue: { x: 785, y: 350, text: 'Stand under the sign — jump the floor RIGHT after it!' },
  },

  {
    // CONCEPT 3: ZERO-SPOILER FAKE EXIT #1 (Sudden Sprint-Away + Hidden Track Materializes!)
    // Camera is strictly locked at x=1500 until the player approaches the exit door at x=1400.
    // Zero visual preview or hints that a whole hidden canyon waits past x=1500!
    id: 3,
    chapter: 1,
    chapterTitle: 'The Introduction',
    levelInChapter: 3,
    name: 'The Door Hates You',
    subtitle: 'Even the finish line wants nothing to do with you.',
    worldWidth: 2240,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    cameraLocks: [{ triggerId: 'lv3_hidden', maxX: 1500 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 340, h: 140, kind: 'solid' },
      { id: 'p2', x: 455, y: 375, w: 140, h: 185, kind: 'solid' },
      { id: 'p3', x: 710, y: 420, w: 455, h: 140, kind: 'solid' },
      { id: 'p4', x: 1285, y: 420, w: 215, h: 140, kind: 'solid' },
      // 100% hidden new track — snaps into existence only when the exit door bolts!
      { id: 'p5_hid', x: 1615, y: 390, w: 115, h: 24, kind: 'crumble', crumbleDelay: 0.45, respawnDelay: 2.2, revealOnTriggerId: 'lv3_hidden' },
      { id: 'p6_hid', x: 1845, y: 420, w: 395, h: 140, kind: 'solid', revealOnTriggerId: 'lv3_hidden' },
    ],
    hazards: [
      { id: 'h1', x: 870, y: 396, w: 48, h: 24, kind: 'spike', dir: 'up' },
      { id: 'h2', x: 1035, y: 396, w: 48, h: 24, kind: 'spike', dir: 'up' },
      { id: 'h3_hid', x: 1935, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1915, triggerRadius: 64, telegraphTime: 0.21, revealOnTriggerId: 'lv3_hidden' },
    ],
    checkpoints: [
      { id: 'cp_fake', x: 525, y: 375, fake: true, fakeBehavior: 'collapse', fakeMessage: 'Checkpoint cancelled.' },
      { id: 'cp_real', x: 760, y: 420, fake: false },
    ],
    signs: [
      { id: 's1', x: 250, y: 420, text: 'Safe Checkpoint →' },
      { id: 's2', x: 1330, y: 420, text: 'Almost There!' },
      { id: 's3_hid', x: 1890, y: 420, text: 'Surprise Track!', revealOnTriggerId: 'lv3_hidden' },
    ],
    fakeRewards: [
      { id: 'r1', x: 960, y: 320, kind: 'coin', prankMessage: 'TAXED 100%. YOU GET NOTHING.' },
    ],
    exits: [
      {
        id: 'e1',
        x: 1410,
        y: 420,
        triggerDistance: 86,
        fakeMessage: 'SO CLOSE! THE DOOR RAN AWAY — NEW TRACK REVEALED!',
        moveTargets: [
          { x: 2125, y: 420, quip: 'Catch me now, loser!', revealsTriggerId: 'lv3_hidden' },
        ],
      },
    ],
    tutorialHints: [
      {
        id: 'l3_step_gap',
        minX: 305,
        maxX: 485,
        x: 400,
        y: 320,
        text: 'Hold Jump at the edge to reach the high ledge.',
        minDeaths: 2,
      },
      {
        id: 'l3_fake_cp_gap',
        minX: 555,
        maxX: 745,
        x: 652,
        y: 324,
        text: 'Skip the fake flag — the real checkpoint is ahead.',
        minDeaths: 2,
      },
      {
        id: 'l3_double_spikes',
        minX: 825,
        maxX: 1125,
        x: 976,
        y: 336,
        text: 'Short tap jumps clear single spikes cleanly.',
        minDeaths: 2,
        causes: ['spike'],
      },
      {
        id: 'l3_final_gap',
        minX: 1130,
        maxX: 1330,
        x: 1225,
        y: 340,
        text: 'Sprint right to the edge for max jump distance.',
        minDeaths: 2,
      },
    ],
    adaptiveClue: { x: 1185, y: 355, text: 'Full running jump across the gap!' },
  },

  {
    // CONCEPT 4: SLIPPERY ICE INK FLOORS — braking fails, momentum carries you into traps!
    id: 4,
    chapter: 1,
    chapterTitle: 'The Introduction',
    levelInChapter: 4,
    name: 'Ice, Ice, Idiot',
    subtitle: 'Friction just filed for divorce. Good luck stopping.',
    worldWidth: 1860,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 260, h: 140, kind: 'solid' },
      { id: 'ice1', x: 260, y: 420, w: 280, h: 140, kind: 'ice' },
      { id: 'ice2', x: 655, y: 395, w: 190, h: 165, kind: 'ice' },
      { id: 'p2', x: 960, y: 420, w: 190, h: 140, kind: 'solid' },
      { id: 'ice3', x: 1150, y: 420, w: 320, h: 140, kind: 'ice' },
      { id: 'ice4', x: 1585, y: 420, w: 275, h: 140, kind: 'ice' },
    ],
    hazards: [
      { id: 'h1', x: 430, y: 396, w: 46, h: 24, kind: 'spike', dir: 'up' },
      { id: 'h2', x: 1295, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1275, triggerRadius: 72, telegraphTime: 0.2 },
      { id: 'h3', x: 1625, y: 396, w: 42, h: 24, kind: 'spike', dir: 'up' },
    ],
    checkpoints: [{ id: 'cp1', x: 1030, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 210, y: 420, text: 'Freshly Waxed →', flippedText: 'Zero Brakes!' },
      { id: 's2', x: 1095, y: 420, text: 'Brake Early!' },
    ],
    fakeRewards: [],
    exits: [{ id: 'e1', x: 1765, y: 420 }],
    tutorialHints: [
      {
        id: 'l4_ice_slide',
        minX: 250,
        maxX: 600,
        x: 410,
        y: 332,
        text: 'Ice carries your slide — jump early before the spike.',
        minDeaths: 2,
      },
      {
        id: 'l4_ice_brake',
        minX: 1140,
        maxX: 1560,
        x: 1340,
        y: 332,
        text: 'Tap back mid-slide to control your speed on ice.',
        minDeaths: 2,
      },
    ],
    adaptiveClue: { x: 1215, y: 350, text: 'Counter-tap left to brake on the glossy ice!' },
  },

  {
    // CONCEPT 5: ZERO-SPOILER FAKE EXIT #2 (Sudden Vanish + Completely Hidden Chapter Finale Track!)
    // Zero reveal_wall, zero visible gap or floor beyond x=1065 until 1 step before touching the door!
    id: 5,
    chapter: 1,
    chapterTitle: 'The Introduction',
    levelInChapter: 5,
    name: 'Tutorial Over, Crybaby',
    subtitle: 'Chapter 1 ends when the level says it ends.',
    worldWidth: 2060,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    cameraLocks: [{ triggerId: 'c1_boss', maxX: 1065 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 300, h: 140, kind: 'solid' },
      { id: 'm1', x: 455, y: 400, w: 120, h: 22, kind: 'moving', moveX: 95, moveY: 0, speed: 1.55 },
      { id: 'p2', x: 730, y: 420, w: 335, h: 140, kind: 'solid' },
      // 100% hidden new track revealed only when fake exit vanishes!
      { id: 'p3_hid', x: 1065, y: 420, w: 365, h: 140, kind: 'solid', revealOnTriggerId: 'c1_boss' },
      { id: 'c1_hid', x: 1540, y: 395, w: 110, h: 24, kind: 'crumble', crumbleDelay: 0.42, respawnDelay: 2.2, revealOnTriggerId: 'c1_boss' },
      {
        id: 'p4_hid',
        x: 1755,
        y: 420,
        w: 155,
        h: 140,
        kind: 'pit_stretch',
        stretchEdge: 'left',
        stretchSpeed: 185,
        maxStretch: 155,
        prankMessage: 'THE PIT IS STRETCHING — SPRINT!',
        revealOnTriggerId: 'c1_boss',
      },
      { id: 'p4_safe', x: 1910, y: 420, w: 150, h: 140, kind: 'solid', revealOnTriggerId: 'c1_boss' },
    ],
    hazards: [
      { id: 'saw1_hid', x: 1280, y: 402, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 85, speed: 2.2, revealOnTriggerId: 'c1_boss' },
      { id: 'h1_hid', x: 1835, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1815, triggerRadius: 65, telegraphTime: 0.2, revealOnTriggerId: 'c1_boss' },
    ],
    checkpoints: [{ id: 'cp1_hid', x: 1165, y: 420, fake: false, revealOnTriggerId: 'c1_boss' }],
    signs: [
      { id: 's1', x: 830, y: 420, text: 'Finish Line →', flippedText: 'Not Even Close.' },
      { id: 's2_hid', x: 1110, y: 420, text: 'REAL TRACK →', revealOnTriggerId: 'c1_boss' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e_fake',
        x: 965,
        y: 420,
        fake: true,
        fakeBehavior: 'vanish',
        approachTriggerDist: 66,
        fakeMessage: 'POOF! THOUGHT YOU WON? REAL TRACK JUST APPEARED.',
        revealsTriggerId: 'c1_boss',
      },
      { id: 'e_real', x: 1945, y: 420, revealOnTriggerId: 'c1_boss' },
    ],
    tutorialHints: [
      {
        id: 'l5_moving_plat',
        minX: 275,
        maxX: 745,
        x: 515,
        y: 326,
        text: 'Wait for the moving slab to swing close, then ride it.',
        minDeaths: 2,
      },
      {
        id: 'l5_saw',
        minX: 1215,
        maxX: 1375,
        x: 1298,
        y: 312,
        text: 'Dash underneath right as the saw rises upward.',
        minDeaths: 2,
        causes: ['saw'],
      },
      {
        id: 'l5_crumble_bridge',
        minX: 1410,
        maxX: 1765,
        x: 1595,
        y: 326,
        text: 'Touch the cracked slab and jump immediately.',
        minDeaths: 2,
      },
      {
        id: 'l5_final_popup',
        minX: 1765,
        maxX: 1915,
        x: 1838,
        y: 336,
        text: 'One last pop-up spike right after landing — hop it.',
        minDeaths: 2,
        causes: ['popup_spike'],
      },
    ],
    adaptiveClue: { x: 1755, y: 350, text: 'Sprint as the pit stretches and hop the hidden spike!' },
  },

  // =========================================================================
  // CHAPTER 2: DON'T TRUST THE FLOOR (Levels 06 - 10)
  // =========================================================================
  {
    // CONCEPT 6: SHRINKING DIET PLATFORMS — wide comfy ledges rapidly squeeze into nothing!
    id: 6,
    chapter: 2,
    chapterTitle: 'The Deception',
    levelInChapter: 1,
    name: 'Diet Platforms',
    subtitle: 'These wide ledges are aggressively losing weight under you.',
    worldWidth: 1960,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 250, h: 140, kind: 'solid' },
      { id: 'sh1', x: 355, y: 400, w: 145, h: 24, kind: 'shrink', shrinkRate: 92, respawnDelay: 2.1 },
      { id: 'sh2', x: 615, y: 370, w: 145, h: 24, kind: 'shrink', shrinkRate: 98, respawnDelay: 2.1 },
      { id: 'sh3', x: 875, y: 345, w: 140, h: 24, kind: 'shrink', shrinkRate: 102, respawnDelay: 2.1 },
      { id: 'p2', x: 1125, y: 400, w: 225, h: 160, kind: 'solid' },
      { id: 'sh4', x: 1460, y: 390, w: 135, h: 24, kind: 'shrink', shrinkRate: 108, respawnDelay: 2.0 },
      { id: 'p3', x: 1705, y: 400, w: 255, h: 160, kind: 'solid' },
    ],
    hazards: [
      { id: 'h1', x: 1755, y: 376, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1735, triggerRadius: 65, telegraphTime: 0.2 },
    ],
    checkpoints: [{ id: 'cp1', x: 1220, y: 400, fake: false }],
    signs: [
      { id: 's1', x: 175, y: 420, text: 'Wide & Comfy →', flippedText: 'Shrinking Fast!' },
    ],
    fakeRewards: [],
    exits: [{ id: 'e1', x: 1870, y: 400 }],
    adaptiveClue: { x: 400, y: 335, text: 'Platforms shrink the instant you land — never pause!' },
  },

  {
    // CONCEPT 7: PHANTOM SOLID BAIT WALL — "impassable" black wall you can literally walk through!
    id: 7,
    chapter: 2,
    chapterTitle: 'The Deception',
    levelInChapter: 2,
    name: 'Wall of Lies',
    subtitle: 'Looks completely solid. The deadly route over it is just for suckers.',
    worldWidth: 2040,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 1160, h: 140, kind: 'solid' },
      // Bait upper route over the fake wall (spiked & sawed!)
      { id: 'step1', x: 470, y: 345, w: 90, h: 20, kind: 'solid' },
      { id: 'step2', x: 600, y: 270, w: 210, h: 22, kind: 'solid' },
      // Giant "impassable" black wall that you literally walk straight through!
      {
        id: 'phantom_wall',
        x: 685,
        y: 292,
        w: 44,
        h: 128,
        kind: 'phantom_solid',
        prankMessage: 'HAHA! THAT WALL WAS FAKE THE WHOLE TIME!',
      },
      { id: 'c1', x: 1280, y: 405, w: 110, h: 24, kind: 'crumble', crumbleDelay: 0.4, respawnDelay: 2.2 },
      { id: 'p3', x: 1505, y: 420, w: 535, h: 140, kind: 'solid' },
    ],
    hazards: [
      { id: 'saw_top', x: 685, y: 230, w: 36, h: 36, kind: 'saw', moveX: 85, moveY: 0, speed: 2.4 },
      { id: 'sp_top', x: 760, y: 246, w: 42, h: 24, kind: 'spike', dir: 'up' },
      { id: 'fb1', x: 1645, y: 145, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1600 },
      { id: 'h1', x: 1785, y: 396, w: 46, h: 24, kind: 'spike', dir: 'up' },
    ],
    checkpoints: [
      { id: 'cp_fake', x: 345, y: 420, fake: true, fakeBehavior: 'fly_up', fakeMessage: 'My planet needs this checkpoint.' },
      { id: 'cp_real', x: 1070, y: 420, fake: false },
    ],
    signs: [
      { id: 's1', x: 435, y: 420, text: 'DEAD END — CLIMB ↑', flippedText: 'Or Just Walk Through.' },
      { id: 's2', x: 1555, y: 420, text: 'Look Up?' },
    ],
    fakeRewards: [
      { id: 'r1', x: 705, y: 205, kind: 'star', prankMessage: 'RISKED YOUR LIFE FOR ZERO POINTS!' },
    ],
    exits: [{ id: 'e1', x: 1920, y: 420 }],
    adaptiveClue: { x: 650, y: 350, text: 'Don’t climb! Walk straight through the fake wall!' },
  },

  {
    // CONCEPT 8: ZERO-SPOILER FAKE EXIT #3 (Door Vanishes & Reveals HIDDEN SKY TRACK ABOVE!)
    // Camera is locked at x=1120 — player thinks the exit at (1015, 420) ends the level.
    // Approach it -> door vanishes, a bounce pad + elevated sky track materializes out of thin air!
    id: 8,
    chapter: 2,
    chapterTitle: 'The Deception',
    levelInChapter: 3,
    name: 'Nice Try, Keep Climbing',
    subtitle: 'Congratulations! You finished the warm-up floor.',
    worldWidth: 2140,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    cameraLocks: [{ triggerId: 'twist_8', maxX: 1120 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 310, h: 140, kind: 'solid' },
      { id: 'm1', x: 470, y: 400, w: 115, h: 22, kind: 'moving', moveX: 110, moveY: 0, speed: 1.65 },
      { id: 'p2', x: 760, y: 420, w: 360, h: 140, kind: 'solid' },
      // 100% hidden sky-track revealed ONLY when fake exit betrays the player!
      { id: 'b_hid', x: 900, y: 404, w: 74, h: 16, kind: 'bounce', bounceVy: -700, revealOnTriggerId: 'twist_8' },
      { id: 'sky1', x: 1090, y: 295, w: 170, h: 24, kind: 'solid', revealOnTriggerId: 'twist_8' },
      { id: 'sky2', x: 1385, y: 270, w: 110, h: 24, kind: 'crumble', crumbleDelay: 0.42, respawnDelay: 2.1, revealOnTriggerId: 'twist_8' },
      { id: 'sky3', x: 1620, y: 245, w: 110, h: 24, kind: 'crumble', crumbleDelay: 0.4, respawnDelay: 2.1, revealOnTriggerId: 'twist_8' },
      { id: 'sky4', x: 1850, y: 265, w: 290, h: 28, kind: 'solid', revealOnTriggerId: 'twist_8' },
    ],
    hazards: [
      { id: 'saw_sky', x: 1295, y: 215, w: 34, h: 34, kind: 'saw', moveX: 0, moveY: 75, speed: 2.25, revealOnTriggerId: 'twist_8' },
      { id: 'h_sky', x: 1915, y: 241, w: 42, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1895, triggerRadius: 60, telegraphTime: 0.2, revealOnTriggerId: 'twist_8' },
    ],
    checkpoints: [{ id: 'cp1_hid', x: 1155, y: 295, fake: false, revealOnTriggerId: 'twist_8' }],
    signs: [
      { id: 's1', x: 840, y: 420, text: 'Easy Level!', flippedText: 'Look Up, Loser.' },
      { id: 's2_hid', x: 1205, y: 295, text: 'Welcome Upstairs →', revealOnTriggerId: 'twist_8' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e_fake',
        x: 1020,
        y: 420,
        fake: true,
        fakeBehavior: 'vanish',
        approachTriggerDist: 66,
        fakeMessage: 'EXIT RELOCATED UPSTAIRS! BOUNCE UP TO THE HIDDEN TRACK!',
        revealsTriggerId: 'twist_8',
      },
      { id: 'e_real', x: 2045, y: 265, revealOnTriggerId: 'twist_8' },
    ],
    adaptiveClue: { x: 935, y: 345, text: 'Use the bounce pad to reach the new upper track!' },
  },

  {
    // CONCEPT 9: DISGUISED CONVEYOR FLOORS — innocent floor tiles secretly shove you forward or backward!
    id: 9,
    chapter: 2,
    chapterTitle: 'The Deception',
    levelInChapter: 4,
    name: 'Treadmill of Regret',
    subtitle: 'The floor has somewhere else it wants you to be.',
    worldWidth: 2120,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 220, h: 140, kind: 'solid' },
      { id: 'cv1', x: 220, y: 420, w: 260, h: 140, kind: 'conveyor', conveyorSpeed: 155, disguised: true },
      { id: 'cv2', x: 605, y: 400, w: 240, h: 160, kind: 'conveyor', conveyorSpeed: -145, disguised: true },
      { id: 'p2', x: 960, y: 420, w: 150, h: 140, kind: 'solid' },
      {
        id: 'p2_stretch',
        x: 1110,
        y: 420,
        w: 110,
        h: 140,
        kind: 'pit_stretch',
        stretchEdge: 'right',
        stretchSpeed: 175,
        maxStretch: 92,
        prankMessage: 'THE PIT AHEAD IS GROWING — JUMP EARLY!',
      },
      { id: 'cv3', x: 1340, y: 395, w: 210, h: 24, kind: 'conveyor', conveyorSpeed: 170 },
      { id: 'cv4', x: 1670, y: 420, w: 450, h: 140, kind: 'conveyor', conveyorSpeed: -135, disguised: true },
    ],
    hazards: [
      { id: 'h1', x: 430, y: 396, w: 46, h: 24, kind: 'spike', dir: 'up' },
      { id: 'h2', x: 1110, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1090, triggerRadius: 65, telegraphTime: 0.19 },
      { id: 'saw1', x: 1835, y: 402, w: 34, h: 34, kind: 'saw', moveX: 0, moveY: 85, speed: 2.3 },
    ],
    checkpoints: [{ id: 'cp1', x: 1020, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 160, y: 420, text: 'Totally Still Floor', flippedText: 'Cardio Time!' },
    ],
    fakeRewards: [],
    exits: [{ id: 'e1', x: 2010, y: 420 }],
    adaptiveClue: { x: 260, y: 350, text: 'Hidden conveyor belts shove you — fight the belt or leap early!' },
  },

  {
    // CONCEPT 10: LOW GRAVITY MOONBOOTS — floaty jumps slam straight into spiked ceilings!
    id: 10,
    chapter: 2,
    chapterTitle: 'The Deception',
    levelInChapter: 5,
    name: 'Moonboots Were a Mistake',
    subtitle: 'Low gravity sounds fun until you float straight into ceiling spikes.',
    worldWidth: 2240,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    gravityScale: 0.72,
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 320, h: 140, kind: 'solid' },
      { id: 'ceil_m1', x: 350, y: 230, w: 280, h: 24, kind: 'solid' },
      { id: 'p2', x: 470, y: 420, w: 320, h: 140, kind: 'solid' },
      { id: 'p3', x: 960, y: 355, w: 130, h: 24, kind: 'solid' },
      { id: 'p4', x: 1245, y: 420, w: 360, h: 140, kind: 'solid' },
      { id: 'ceil_m2', x: 1360, y: 235, w: 240, h: 24, kind: 'solid' },
      { id: 'p5', x: 1775, y: 420, w: 465, h: 140, kind: 'solid' },
    ],
    hazards: [
      { id: 'hc1', x: 365, y: 254, w: 250, h: 22, kind: 'spike', dir: 'down' },
      { id: 'sp1', x: 640, y: 396, w: 44, h: 24, kind: 'spike', dir: 'up' },
      { id: 'hc2', x: 1375, y: 259, w: 210, h: 22, kind: 'spike', dir: 'down' },
      { id: 'h2', x: 1885, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1865, triggerRadius: 65, telegraphTime: 0.19 },
    ],
    checkpoints: [{ id: 'cp1', x: 1295, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 195, y: 420, text: 'LOW GRAVITY · TAP JUMP ↑' },
    ],
    fakeRewards: [
      { id: 'r1', x: 1025, y: 260, kind: 'coin', prankMessage: 'FLOATED RIGHT INTO NOTHING.' },
    ],
    exits: [
      {
        id: 'e1',
        x: 2015,
        y: 420,
        triggerDistance: 90,
        moveTargets: [{ x: 2145, y: 420, quip: 'Float faster!' }],
      },
    ],
    adaptiveClue: { x: 340, y: 345, text: 'Tap jump briefly — full jumps float into the ceiling!' },
  },

  // =========================================================================
  // CHAPTER 3: THE GAME IS WATCHING (Levels 11 - 15)
  // =========================================================================
  {
    // CONCEPT 11: ZERO-JUMP PSYCHOLOGICAL TRAP — literally beat it by NEVER pressing jump!
    id: 11,
    chapter: 3,
    chapterTitle: 'The Manipulation',
    levelInChapter: 1,
    name: 'Stop Pressing Jump, Genius',
    subtitle: 'Your thumb is literally your worst enemy here.',
    worldWidth: 1720,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 1720, h: 140, kind: 'solid' },
      { id: 'ceil1', x: 350, y: 270, w: 190, h: 26, kind: 'solid' },
      { id: 'ceil2', x: 780, y: 270, w: 230, h: 26, kind: 'solid' },
      { id: 'ceil3', x: 1220, y: 270, w: 185, h: 26, kind: 'solid' },
    ],
    hazards: [
      { id: 'h1', x: 365, y: 296, w: 160, h: 22, kind: 'spike', dir: 'down' },
      { id: 'h2', x: 795, y: 296, w: 200, h: 22, kind: 'spike', dir: 'down' },
      { id: 'saw_high', x: 1095, y: 332, w: 36, h: 36, kind: 'saw', moveX: 75, moveY: 0, speed: 2.3 },
      { id: 'h3', x: 1235, y: 296, w: 155, h: 22, kind: 'spike', dir: 'down' },
    ],
    checkpoints: [],
    signs: [
      { id: 's1', x: 315, y: 420, text: 'JUMP NOW! ↑', flippedText: 'Why did you listen?' },
      { id: 's2', x: 740, y: 420, text: 'LAVA FLOOR! ↑', flippedText: 'Just ink.' },
      { id: 's3', x: 1185, y: 420, text: 'DEFINITELY JUMP!', flippedText: 'Peaceful walk.' },
    ],
    fakeRewards: [
      { id: 'r1', x: 645, y: 380, kind: 'coin', prankMessage: 'YOU WALKED INTO A PRANK.' },
    ],
    exits: [{ id: 'e1', x: 1580, y: 420 }],
    adaptiveClue: { x: 235, y: 355, text: 'Hint: Literally never press jump.' },
  },

  {
    // CONCEPT 12: PROXIMITY-SHIFTING DODGE PLATFORMS + ADAPTIVE TRAPS!
    // Platforms sit innocently where you aim, then scoot sideways right as you approach!
    id: 12,
    chapter: 3,
    chapterTitle: 'The Manipulation',
    levelInChapter: 2,
    name: 'Shifty Business',
    subtitle: 'These platforms dodge you like you owe them money.',
    worldWidth: 2060,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 340, h: 140, kind: 'solid' },
      { id: 'p_ad_ceil', x: 140, y: 270, w: 170, h: 24, kind: 'solid', adaptiveCondition: 'jump_spam' },
      // Slides +55px right when approached (still well within jump reach at x=470 -> 525!)
      {
        id: 'shf1',
        x: 445,
        y: 395,
        w: 110,
        h: 24,
        kind: 'proximity_shift',
        shiftX: 55,
        shiftY: 0,
        triggerDist: 145,
        shiftSpeed: 310,
        prankMessage: 'MISSED ME! JUMP WHERE IT GOES!',
      },
      { id: 'p2', x: 730, y: 420, w: 350, h: 140, kind: 'solid' },
      // Drops 45px downward when approached — aim lower or wait for it!
      {
        id: 'shf2',
        x: 1190,
        y: 355,
        w: 110,
        h: 24,
        kind: 'proximity_shift',
        shiftX: 0,
        shiftY: 55,
        triggerDist: 140,
        shiftSpeed: 300,
      },
      { id: 'p3', x: 1415, y: 420, w: 645, h: 140, kind: 'solid' },
    ],
    hazards: [
      { id: 'h_ad_jump', x: 155, y: 294, w: 140, h: 22, kind: 'spike', dir: 'down', adaptiveCondition: 'jump_spam' },
      { id: 'h_ad_rush', x: 920, y: 402, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 85, speed: 2.5, adaptiveCondition: 'rusher' },
      { id: 'h_ad_camp', x: 165, y: 398, w: 30, h: 30, kind: 'sweeper', moveX: 145, moveY: 0, speed: 1.6, adaptiveCondition: 'camper' },
      { id: 'h1', x: 1580, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1560, triggerRadius: 65, telegraphTime: 0.19 },
    ],
    checkpoints: [{ id: 'cp1', x: 805, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 255, y: 420, text: 'Steady Platform →', flippedText: 'Psych! It Moved.' },
    ],
    fakeRewards: [
      { id: 'r1', x: 960, y: 300, kind: 'star', prankMessage: 'ADAPTIVE IQ: STILL ZERO.' },
    ],
    exits: [
      {
        id: 'e1',
        x: 1770,
        y: 420,
        triggerDistance: 95,
        moveTargets: [{ x: 1935, y: 420, quip: 'Read you like a book!' }],
      },
    ],
    adaptiveClue: { x: 430, y: 335, text: 'Bait the shifting ledges first — or overshoot onto their new spot!' },
  },

  {
    // CONCEPT 13: INVISIBLE GHOST BRIDGE + RETRACTING DECOY SPIKES!
    // Spikes retract harmlessly right as you panic-jump... right onto the real popup behind them!
    id: 13,
    chapter: 3,
    chapterTitle: 'The Manipulation',
    levelInChapter: 3,
    name: 'Blame Your Eyesight',
    subtitle: 'Invisible ledges and spikes that disappear just to ruin your jump.',
    worldWidth: 2080,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 295, h: 140, kind: 'solid' },
      { id: 'inv1', x: 405, y: 395, w: 105, h: 22, kind: 'invisible' },
      { id: 'inv2', x: 625, y: 360, w: 105, h: 22, kind: 'invisible' },
      { id: 'inv3', x: 845, y: 390, w: 105, h: 22, kind: 'invisible' },
      { id: 'p2', x: 1060, y: 420, w: 360, h: 140, kind: 'solid' },
      { id: 'pb1', x: 1525, y: 390, w: 105, h: 22, kind: 'phase_blink', blinkOnTime: 1.65, blinkOffTime: 0.95, blinkPhase: 0 },
      { id: 'pb2', x: 1735, y: 380, w: 105, h: 22, kind: 'phase_blink', blinkOnTime: 1.65, blinkOffTime: 0.95, blinkPhase: 1.3 },
      { id: 'p3', x: 1935, y: 420, w: 145, h: 140, kind: 'solid' },
    ],
    hazards: [
      // Fake-out retracting spike baits an early jump right into the real pop-up spike 95px ahead!
      { id: 'ret1', x: 1185, y: 396, w: 46, h: 24, kind: 'retract_spike', dir: 'up', triggerX: 1195, triggerRadius: 82 },
      { id: 'h1', x: 1290, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1270, triggerRadius: 65, telegraphTime: 0.19 },
    ],
    checkpoints: [{ id: 'cp1', x: 1110, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 220, y: 420, text: 'Trust The Dots →' },
      { id: 's2', x: 1130, y: 420, text: 'Jump The First Spike!', flippedText: 'That One Was Shy.' },
    ],
    fakeRewards: [],
    exits: [{ id: 'e1', x: 2010, y: 420 }],
    adaptiveClue: { x: 1190, y: 345, text: 'First spike retracts harmlessly — save your jump for the red slit!' },
  },

  {
    // CONCEPT 14: SILENT INVERTED CONTROLS ZONE — Left and Right flip mid-level!
    id: 14,
    chapter: 3,
    chapterTitle: 'The Manipulation',
    levelInChapter: 4,
    name: 'Brain Meltdown',
    subtitle: 'Left is right. Right is wrong. Your brain is officially cooked.',
    worldWidth: 2180,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    reverseControlZones: [{ minX: 1080, maxX: 2060 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 360, h: 140, kind: 'solid' },
      { id: 'inv1', x: 475, y: 390, w: 105, h: 22, kind: 'invisible' },
      { id: 'c1', x: 695, y: 365, w: 105, h: 22, kind: 'crumble', crumbleDelay: 0.4, respawnDelay: 2.1 },
      { id: 'p2', x: 915, y: 420, w: 500, h: 140, kind: 'solid' },
      { id: 'p3', x: 1525, y: 420, w: 655, h: 140, kind: 'solid' },
    ],
    hazards: [
      { id: 'saw1', x: 1245, y: 402, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 85, speed: 2.25 },
      { id: 'fb1', x: 1715, y: 140, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1670 },
      { id: 'h2', x: 1865, y: 396, w: 46, h: 24, kind: 'spike', dir: 'up' },
    ],
    checkpoints: [{ id: 'cp1', x: 990, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 300, y: 420, text: 'NO FLOOR ←', flippedText: 'There totally was.' },
      { id: 's2', x: 1090, y: 420, text: 'RELAX! EASY PART →', flippedText: '← CONTROLS FLIPPED →' },
    ],
    fakeRewards: [
      { id: 'r1', x: 1150, y: 325, kind: 'coin', prankMessage: 'WAIT, WHICH WAY IS LEFT?!' },
    ],
    exits: [{ id: 'e1', x: 2075, y: 420 }],
    adaptiveClue: { x: 1120, y: 350, text: 'Past the sign, Left & Right are reversed!' },
  },

  {
    // CONCEPT 15: ZERO-SPOILER FAKE EXIT #4 (Sudden Vanish + Hidden Track + Fleeing Checkpoint!)
    // Camera strictly locked at x=1110 until 1 step before touching the fake exit!
    id: 15,
    chapter: 3,
    chapterTitle: 'The Manipulation',
    levelInChapter: 5,
    name: 'Halfway? Cute Illusion',
    subtitle: 'A fleeing checkpoint and a vanishing door walk into a room.',
    worldWidth: 2380,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    cameraLocks: [{ triggerId: 'twist_15', maxX: 1110 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 340, h: 140, kind: 'solid' },
      { id: 'c1', x: 455, y: 395, w: 100, h: 22, kind: 'crumble', crumbleDelay: 0.36, respawnDelay: 2.1 },
      { id: 'p2', x: 675, y: 420, w: 435, h: 140, kind: 'solid' },
      // 100% hidden second track — snaps into existence only when e_fake vanishes!
      { id: 'p3_hid', x: 1110, y: 420, w: 305, h: 140, kind: 'solid', revealOnTriggerId: 'twist_15' },
      { id: 'm1_hid', x: 1575, y: 395, w: 110, h: 22, kind: 'moving', moveX: 90, moveY: 0, speed: 1.95, revealOnTriggerId: 'twist_15' },
      { id: 'c2_hid', x: 1840, y: 370, w: 100, h: 22, kind: 'crumble', crumbleDelay: 0.36, respawnDelay: 2.1, revealOnTriggerId: 'twist_15' },
      { id: 'p4_hid', x: 2055, y: 410, w: 325, h: 150, kind: 'solid', revealOnTriggerId: 'twist_15' },
    ],
    hazards: [
      { id: 'saw1_hid', x: 1320, y: 402, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 88, speed: 2.45, revealOnTriggerId: 'twist_15' },
      { id: 'saw2_hid', x: 1735, y: 335, w: 34, h: 34, kind: 'saw', moveX: 0, moveY: 75, speed: 2.2, phase: 1.5, revealOnTriggerId: 'twist_15' },
      { id: 'h1_hid', x: 2115, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2095, triggerRadius: 65, telegraphTime: 0.18, revealOnTriggerId: 'twist_15' },
    ],
    checkpoints: [
      { id: 'cp_fake', x: 760, y: 420, fake: true, fakeBehavior: 'run_away', fakeMessage: 'Catch me if you can!' },
      { id: 'cp_real_hid', x: 1200, y: 420, fake: false, revealOnTriggerId: 'twist_15' },
    ],
    signs: [
      { id: 's1', x: 890, y: 420, text: 'Chapter Complete!', flippedText: 'Psych!' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e_fake',
        x: 1010,
        y: 420,
        fake: true,
        fakeBehavior: 'vanish',
        approachTriggerDist: 68,
        fakeMessage: 'VANISHED! YOU WEREN’T EVEN HALFWAY DONE!',
        revealsTriggerId: 'twist_15',
      },
      { id: 'e_real', x: 2265, y: 410, revealOnTriggerId: 'twist_15' },
    ],
    adaptiveClue: { x: 2060, y: 345, text: 'Hop the hidden spike right as you land!' },
  },

  // =========================================================================
  // CHAPTER 4: SKILL ISSUE CERTIFIED (Levels 16 - 20)
  // =========================================================================
  {
    // CONCEPT 16: TRAP ELEVATOR + ANGLED BOUNCE PAD + ZERO-SPOILER HIDDEN VIP EXIT!
    // Rising trap elevator lifts you straight into ceiling spikes unless you bail onto the VIP ledge!
    id: 16,
    chapter: 4,
    chapterTitle: 'The Cruelty',
    levelInChapter: 1,
    name: 'Spring-Loaded Betrayal',
    subtitle: 'Ride the elevator too long and become ceiling art.',
    worldWidth: 2140,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    cameraLocks: [{ triggerId: 'vip_denied_16', maxX: 1180 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 300, h: 140, kind: 'solid' },
      // Angled bounce pad that flings forward — brake slightly to land cleanly!
      { id: 'b1', x: 350, y: 410, w: 72, h: 16, kind: 'bounce', bounceVy: -650, bounceVx: 240 },
      { id: 'p2', x: 520, y: 420, w: 200, h: 140, kind: 'solid' },
      // Trap elevator rises up toward ceiling spikes — hop off onto the upper ledge at y=280!
      { id: 'el1', x: 755, y: 410, w: 100, h: 22, kind: 'elevator', moveY: -220, speed: 125 },
      { id: 'ceil_el', x: 730, y: 140, w: 150, h: 24, kind: 'solid' },
      { id: 'u2', x: 895, y: 280, w: 285, h: 26, kind: 'solid' },
      // 100% hidden track revealed when the VIP door vanishes!
      { id: 'c1_hid', x: 1310, y: 335, w: 100, h: 22, kind: 'crumble', crumbleDelay: 0.35, respawnDelay: 2.1, revealOnTriggerId: 'vip_denied_16' },
      { id: 'c2_hid', x: 1555, y: 370, w: 100, h: 22, kind: 'crumble', crumbleDelay: 0.35, respawnDelay: 2.1, revealOnTriggerId: 'vip_denied_16' },
      { id: 'p3_hid', x: 1790, y: 410, w: 350, h: 150, kind: 'solid', revealOnTriggerId: 'vip_denied_16' },
    ],
    hazards: [
      { id: 'hc_el', x: 745, y: 164, w: 120, h: 22, kind: 'spike', dir: 'down' },
      { id: 'h1_hid', x: 1875, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1855, triggerRadius: 65, telegraphTime: 0.18, revealOnTriggerId: 'vip_denied_16' },
    ],
    checkpoints: [{ id: 'cp1', x: 585, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 220, y: 420, text: 'Free Launch →' },
      { id: 's2', x: 965, y: 280, text: 'VIP EXIT →' },
    ],
    fakeRewards: [
      { id: 'r1', x: 995, y: 225, kind: 'trophy', prankMessage: 'VIP PASS REVOKED.' },
    ],
    exits: [
      {
        id: 'e_vip',
        x: 1105,
        y: 280,
        fake: true,
        fakeBehavior: 'vanish',
        approachTriggerDist: 64,
        fakeMessage: 'VIP DENIED! JUMP ONTO THE HIDDEN SKYWAY!',
        revealsTriggerId: 'vip_denied_16',
      },
      { id: 'e_real', x: 2040, y: 410, revealOnTriggerId: 'vip_denied_16' },
    ],
    adaptiveClue: { x: 760, y: 330, text: 'Bail off the rising elevator before the ceiling spikes!' },
  },

  {
    // CONCEPT 17: GALE-FORCE WIND ZONES — headwind kills short jumps, then tailwind shoves you into traps!
    id: 17,
    chapter: 4,
    chapterTitle: 'The Cruelty',
    levelInChapter: 2,
    name: 'Gust of Spite',
    subtitle: 'First the wind holds you back. Then it shoves you into a crusher.',
    worldWidth: 2300,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    windZones: [
      { minX: 250, maxX: 1050, forceX: -360 },
      { minX: 1260, maxX: 2150, forceX: 430 },
    ],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 280, h: 140, kind: 'solid' },
      { id: 'p2', x: 400, y: 400, w: 125, h: 24, kind: 'solid' },
      { id: 'p3', x: 640, y: 380, w: 125, h: 24, kind: 'solid' },
      { id: 'p4', x: 885, y: 420, w: 380, h: 140, kind: 'solid' },
      { id: 'fd1', x: 1265, y: 420, w: 105, h: 140, kind: 'fake_drop', triggerDist: 45, dropDistance: 220 },
      { id: 'p5', x: 1370, y: 420, w: 930, h: 140, kind: 'solid' },
    ],
    hazards: [
      { id: 'saw1', x: 565, y: 340, w: 34, h: 34, kind: 'saw', moveX: 0, moveY: 72, speed: 2.3 },
      { id: 'fb1', x: 1625, y: 140, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1580 },
      { id: 'h1', x: 1815, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1795, triggerRadius: 68, telegraphTime: 0.18 },
    ],
    checkpoints: [{ id: 'cp1', x: 1040, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 190, y: 420, text: 'Breezy Forecast →' },
      { id: 's2', x: 1185, y: 420, text: 'Wind Shift Ahead!' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e1',
        x: 1995,
        y: 420,
        triggerDistance: 95,
        moveTargets: [
          { x: 2180, y: 420, quip: 'Blown away yet?' },
        ],
      },
    ],
    adaptiveClue: { x: 1350, y: 350, text: 'Tailwind boosts your jump — brake before the crusher!' },
  },

  {
    // CONCEPT 18: REWORKED LIGHTS-OUT BLACKOUT MODE — near-pitch-black visibility,
    // tight spotlight halo, periodic controlled flashes revealing silhouettes for memory,
    // concealed drop, dark proximity-shift, and a betrayal LIGHTS power-surge switch!
    id: 18,
    chapter: 4,
    chapterTitle: 'The Trap II',
    levelInChapter: 3,
    name: 'Lights Out, Loser',
    subtitle: 'Pitch-black void. Tight beam. Memorize the flashes or walk straight into teeth.',
    worldWidth: 2350,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    spotlightRadius: 118,
    darknessFlashInterval: 5.0,
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 245, h: 140, kind: 'solid' },
      { id: 'fd_dark', x: 245, y: 420, w: 85, h: 140, kind: 'fake_drop', hideSeam: true, triggerDist: 42, dropDistance: 230 },
      { id: 'p1b', x: 330, y: 420, w: 120, h: 140, kind: 'solid' },
      { id: 'm1', x: 590, y: 395, w: 116, h: 22, kind: 'moving', moveX: 78, moveY: 0, speed: 1.75 },
      { id: 'shf_dark', x: 860, y: 375, w: 110, h: 22, kind: 'proximity_shift', shiftX: 40, shiftY: 0, triggerDist: 120, shiftSpeed: 290 },
      { id: 'p2', x: 1095, y: 420, w: 330, h: 140, kind: 'solid' },
      { id: 'pb_dark', x: 1545, y: 395, w: 116, h: 22, kind: 'phase_blink', blinkOnTime: 1.7, blinkOffTime: 0.85, blinkPhase: 0, revealOnTriggerId: 'lv18_lights' },
      { id: 'p3', x: 1785, y: 420, w: 565, h: 140, kind: 'solid' },
    ],
    hazards: [
      { id: 'h1', x: 1320, y: 396, w: 44, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1300, triggerRadius: 68, telegraphTime: 0.22 },
      { id: 'fb_dark', x: 1925, y: 120, w: 64, h: 52, kind: 'falling_block', fallTriggerX: 1875, revealOnTriggerId: 'lv18_lights' },
      { id: 'h2', x: 2075, y: 396, w: 44, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2055, triggerRadius: 68, telegraphTime: 0.22 },
    ],
    checkpoints: [{ id: 'cp1', x: 1145, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 165, y: 420, text: 'Wait For The Flash' },
    ],
    switches: [
      {
        id: 'sw_lights',
        x: 1215,
        y: 420,
        label: 'LIGHTS',
        triggersId: 'lv18_lights',
        betrayal: true,
        prankMessage: 'POWER SURGE! MEMORIZE THE BLINKING PATH BEFORE DARKNESS RETURNS!',
      },
    ],
    fakeRewards: [
      { id: 'r1', x: 1995, y: 315, kind: 'trophy', prankMessage: 'FOUND A PRANK IN THE DARK.', triggersBounce: true },
    ],
    exits: [{ id: 'e1', x: 2235, y: 420 }],
    adaptiveClue: { x: 1215, y: 345, text: 'Watch the flashes, hit LIGHTS, and time the dark blinking bridge!' },
  },

  {
    // CONCEPT 19: RELENTLESS CHASER SAW — awakens behind you and forces a zero-hesitation sprint!
    id: 19,
    chapter: 4,
    chapterTitle: 'The Cruelty',
    levelInChapter: 4,
    name: 'Outrun Your Regrets',
    subtitle: 'Stop looking back. The giant saw behind you does not blink.',
    worldWidth: 2360,
    worldHeight: 540,
    spawn: { x: 140, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 400, h: 140, kind: 'solid' },
      { id: 'c1', x: 525, y: 395, w: 100, h: 22, kind: 'crumble', crumbleDelay: 0.36, respawnDelay: 1.9 },
      { id: 'inv1', x: 755, y: 370, w: 100, h: 22, kind: 'invisible' },
      { id: 'p2', x: 985, y: 410, w: 400, h: 150, kind: 'solid' },
      { id: 'ceil1', x: 1495, y: 272, w: 260, h: 24, kind: 'solid' },
      { id: 'p3', x: 1475, y: 420, w: 885, h: 140, kind: 'solid' },
    ],
    hazards: [
      { id: 'chaser1', x: 18, y: 364, w: 58, h: 58, kind: 'chaser', triggerX: 250, chaseSpeed: 198, chaseMaxX: 2140 },
      { id: 'h1', x: 1510, y: 296, w: 230, h: 22, kind: 'spike', dir: 'down' },
      { id: 'h2', x: 1855, y: 396, w: 48, h: 24, kind: 'spike', dir: 'up' },
      { id: 'fb1', x: 2015, y: 140, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1970 },
    ],
    checkpoints: [{ id: 'cp1', x: 1060, y: 410, fake: false }],
    signs: [
      { id: 's1', x: 245, y: 420, text: 'Take Your Time...', flippedText: 'RUN!!' },
      { id: 's2', x: 1495, y: 420, text: 'DON’T JUMP HERE!' },
    ],
    fakeRewards: [],
    exits: [{ id: 'e1', x: 2245, y: 420 }],
    adaptiveClue: { x: 1470, y: 350, text: 'Sprint flat under the ceiling spikes — keep ahead of the saw!' },
  },

  {
    // CONCEPT 20: ZERO-SPOILER DOUBLE FAKE EXIT BETRAYAL!
    // Lock #1 hides Track 2 completely until 1 step before Fake Exit #1.
    // Lock #2 hides Track 3 completely until 1 step before Fake Exit #2!
    id: 20,
    chapter: 4,
    chapterTitle: 'The Cruelty',
    levelInChapter: 5,
    name: 'Rage Quit Button Is Top Right',
    subtitle: 'Two vanishing exits. Two hidden tracks. Zero mercy.',
    worldWidth: 2580,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    cameraLocks: [
      { triggerId: 'rq_a', maxX: 980 },
      { triggerId: 'rq_b', maxX: 2000 },
    ],
    platforms: [
      // Track 1 (visible from start — looks like a short level ending at x=885!)
      { id: 'p1', x: 0, y: 420, w: 300, h: 140, kind: 'solid' },
      { id: 'c1', x: 425, y: 395, w: 96, h: 22, kind: 'crumble', crumbleDelay: 0.34, respawnDelay: 2.0 },
      { id: 'p2', x: 645, y: 420, w: 335, h: 140, kind: 'solid' },
      // Track 2 (100% hidden until Fake Exit #1 vanishes!)
      { id: 'p3_hid', x: 980, y: 420, w: 355, h: 140, kind: 'solid', revealOnTriggerId: 'rq_a' },
      { id: 'm1_hid', x: 1485, y: 395, w: 105, h: 22, kind: 'moving', moveX: 85, moveY: 0, speed: 2.0, revealOnTriggerId: 'rq_a' },
      { id: 'p4_hid', x: 1735, y: 420, w: 265, h: 140, kind: 'solid', revealOnTriggerId: 'rq_a' },
      // Track 3 (100% hidden until Fake Exit #2 vanishes!)
      { id: 'p5_hid2', x: 2000, y: 420, w: 580, h: 140, kind: 'solid', revealOnTriggerId: 'rq_b' },
    ],
    hazards: [
      { id: 'saw1_hid', x: 1205, y: 402, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 85, speed: 2.5, revealOnTriggerId: 'rq_a' },
      { id: 'fb1_hid2', x: 2145, y: 140, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 2100, revealOnTriggerId: 'rq_b' },
      { id: 'h1_hid2', x: 2295, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2275, triggerRadius: 65, telegraphTime: 0.17, revealOnTriggerId: 'rq_b' },
    ],
    checkpoints: [{ id: 'cp1_hid', x: 1065, y: 420, fake: false, revealOnTriggerId: 'rq_a' }],
    signs: [
      { id: 's1', x: 760, y: 420, text: 'Short Level!', flippedText: 'Liar #1' },
      { id: 's2_hid', x: 1805, y: 420, text: 'Okay THIS Is It!', flippedText: 'Liar #2', revealOnTriggerId: 'rq_a' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e_fake1',
        x: 885,
        y: 420,
        fake: true,
        fakeBehavior: 'vanish',
        approachTriggerDist: 66,
        fakeMessage: 'GONE! FAKE EXIT #1 — NEW TRACK REVEALED!',
        revealsTriggerId: 'rq_a',
      },
      {
        id: 'e_fake2',
        x: 1905,
        y: 420,
        fake: true,
        fakeBehavior: 'vanish',
        approachTriggerDist: 66,
        fakeMessage: 'GOT YOU AGAIN! FAKE EXIT #2 — KEEP RUNNING!',
        revealsTriggerId: 'rq_b',
        revealOnTriggerId: 'rq_a',
      },
      { id: 'e_real', x: 2465, y: 420, revealOnTriggerId: 'rq_b' },
    ],
    adaptiveClue: { x: 2110, y: 350, text: 'Bait the crusher then jump the hidden spike!' },
  },

  // =========================================================================
  // CHAPTER 5: PURE EMOTIONAL DAMAGE (Levels 21 - 25)
  // =========================================================================
  {
    // CONCEPT 21: HEAVY GRAVITY ("LEAD BOOTS") + FLASH SHRINK & CRUMBLE MARATHON!
    // gravityScale 1.18 -> snappy, weighty hops (gaps <= 135px, step-ups <= 45px, 100% passable!)
    id: 21,
    chapter: 5,
    chapterTitle: 'Psychological Warfare',
    levelInChapter: 1,
    name: 'Lead Boots',
    subtitle: 'Heavy gravity. Shrinking stones. Zero hang time.',
    worldWidth: 2240,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    gravityScale: 1.18,
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 240, h: 140, kind: 'solid' },
      { id: 'c1', x: 355, y: 400, w: 96, h: 22, kind: 'crumble', crumbleDelay: 0.34, respawnDelay: 1.9 },
      { id: 'sh1', x: 565, y: 380, w: 120, h: 22, kind: 'shrink', shrinkRate: 105, respawnDelay: 1.9 },
      { id: 'c2', x: 800, y: 360, w: 96, h: 22, kind: 'crumble', crumbleDelay: 0.34, respawnDelay: 1.9 },
      { id: 'p2', x: 1015, y: 395, w: 280, h: 165, kind: 'solid' },
      { id: 'sh2', x: 1405, y: 395, w: 120, h: 22, kind: 'shrink', shrinkRate: 110, respawnDelay: 1.9 },
      { id: 'c3', x: 1640, y: 380, w: 96, h: 22, kind: 'crumble', crumbleDelay: 0.34, respawnDelay: 1.9 },
      {
        id: 'p3_stretch',
        x: 1850,
        y: 410,
        w: 245,
        h: 150,
        kind: 'pit_stretch',
        stretchEdge: 'left',
        stretchSpeed: 205,
        maxStretch: 245,
        prankMessage: 'RUN! THE PIT IS CHASING YOU IN HEAVY GRAVITY!',
      },
      { id: 'p3_end', x: 2095, y: 410, w: 145, h: 150, kind: 'solid' },
      { id: 'ceil_flip21', x: 1875, y: 226, w: 235, h: 22, kind: 'solid', revealOnTriggerId: 'lv21_grav_flip' },
    ],
    hazards: [
      { id: 'saw1', x: 1200, y: 377, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: 2.55 },
      { id: 'hc_flip21', x: 1890, y: 248, w: 205, h: 20, kind: 'spike', dir: 'down', revealOnTriggerId: 'lv21_grav_flip' },
      { id: 'h1', x: 1920, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1900, triggerRadius: 65, telegraphTime: 0.16 },
      { id: 'h2', x: 2045, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2025, triggerRadius: 65, telegraphTime: 0.16 },
    ],
    checkpoints: [{ id: 'cp1', x: 1065, y: 395, fake: false }],
    signs: [
      { id: 's1', x: 165, y: 420, text: 'HEAVY GRAVITY →' },
    ],
    switches: [
      {
        id: 'sw_grav21',
        x: 1120,
        y: 395,
        label: 'LIGHTEN?',
        triggersId: 'lv21_grav_flip',
        gravityOverride: 0.78,
        betrayal: true,
        prankMessage: 'GRAVITY FLIPPED TO MOON MODE! WATCH YOUR HEAD AHEAD!',
      },
    ],
    fakeRewards: [],
    exits: [{ id: 'e1', x: 2155, y: 410 }],
    adaptiveClue: { x: 1885, y: 340, text: 'Jump from the very lip — heavy gravity cuts air time!' },
  },

  {
    // CONCEPT 22: TROLL REMIX OF LEVEL 1 + SLIDING INTERCEPT SPIKE + ZERO-SPOILER HIDDEN PART 2!
    // Camera locks at x=1160 so it looks 100% identical to Level 1 until the door vanishes!
    id: 22,
    chapter: 5,
    chapterTitle: 'Psychological Warfare',
    levelInChapter: 2,
    name: 'Déjà Vu (Still Falling For It)',
    subtitle: 'Looks just like Level 01. Lies ten times worse.',
    worldWidth: 2440,
    worldHeight: 540,
    spawn: { x: 80, y: 370 },
    cameraLocks: [{ triggerId: 'deja_22', maxX: 1160 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 420, h: 140, kind: 'solid' },
      { id: 'p2', x: 530, y: 420, w: 280, h: 140, kind: 'solid' },
      { id: 'p_drop', x: 810, y: 420, w: 110, h: 140, kind: 'fake_drop', triggerDist: 55, dropDistance: 220 },
      { id: 'p3', x: 920, y: 420, w: 240, h: 140, kind: 'solid' },
      // 100% hidden Part 2 revealed ONLY when Level 1's exit vanishes!
      { id: 'p4_hid', x: 1160, y: 420, w: 260, h: 140, kind: 'conveyor', conveyorSpeed: 150, revealOnTriggerId: 'deja_22' },
      { id: 'c1_hid', x: 1555, y: 395, w: 94, h: 22, kind: 'crumble', crumbleDelay: 0.32, respawnDelay: 1.9, revealOnTriggerId: 'deja_22' },
      { id: 'm1_hid', x: 1815, y: 380, w: 100, h: 22, kind: 'moving', moveX: 85, moveY: 0, speed: 2.15, revealOnTriggerId: 'deja_22' },
      { id: 'p5_hid', x: 2065, y: 405, w: 375, h: 155, kind: 'solid', revealOnTriggerId: 'deja_22' },
    ],
    hazards: [
      // Sliding spike intercepts your landing from gap #1!
      { id: 'sl1', x: 640, y: 396, w: 44, h: 24, kind: 'sliding_spike', dir: 'up', triggerX: 520, triggerRadius: 95, slideX: -80, slideSpeed: 310 },
      { id: 'saw1_hid', x: 1340, y: 402, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: 2.6, revealOnTriggerId: 'deja_22' },
      { id: 'h2_hid', x: 2120, y: 381, w: 44, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2100, triggerRadius: 65, telegraphTime: 0.17, revealOnTriggerId: 'deja_22' },
    ],
    checkpoints: [{ id: 'cp1_hid', x: 1225, y: 420, fake: false, revealOnTriggerId: 'deja_22' }],
    signs: [
      { id: 's1', x: 190, y: 420, text: 'Walk Right →', flippedText: 'Still Falling For It?' },
      { id: 's2', x: 860, y: 420, text: '100% Solid Floor' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e_fake',
        x: 1065,
        y: 420,
        fake: true,
        fakeBehavior: 'vanish',
        approachTriggerDist: 68,
        fakeMessage: 'TOO EASY! WELCOME TO HIDDEN PART TWO!',
        revealsTriggerId: 'deja_22',
      },
      {
        id: 'e_real',
        x: 2220,
        y: 405,
        triggerDistance: 95,
        revealOnTriggerId: 'deja_22',
        moveTargets: [{ x: 2350, y: 405, quip: 'One more step!' }],
      },
    ],
    adaptiveClue: { x: 540, y: 345, text: 'The spike slides left to catch you — land late or jump over!' },
  },

  {
    // CONCEPT 23: SHORT-HOP SPIKE TUNNEL + RETRACTING DECOY + SLIDING FLOOR SPIKE!
    id: 23,
    chapter: 5,
    chapterTitle: 'Psychological Warfare',
    levelInChapter: 3,
    name: 'Zero Survival Instincts',
    subtitle: 'Short hops under ceiling spikes while the floor spikes play tag.',
    worldWidth: 2480,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 980, h: 140, kind: 'solid' },
      { id: 'ceil1', x: 280, y: 248, w: 620, h: 24, kind: 'solid' },
      { id: 'inv1', x: 1110, y: 395, w: 94, h: 22, kind: 'invisible' },
      { id: 'inv2', x: 1345, y: 370, w: 94, h: 22, kind: 'invisible' },
      { id: 'p2', x: 1580, y: 410, w: 900, h: 150, kind: 'solid' },
    ],
    hazards: [
      { id: 'hc', x: 295, y: 272, w: 590, h: 22, kind: 'spike', dir: 'down' },
      { id: 'ret_f1', x: 420, y: 396, w: 42, h: 24, kind: 'retract_spike', dir: 'up', triggerX: 430, triggerRadius: 74 },
      { id: 'sl_f2', x: 645, y: 396, w: 42, h: 24, kind: 'sliding_spike', dir: 'up', triggerX: 600, triggerRadius: 85, slideX: 72, slideSpeed: 295 },
      { id: 'fb1', x: 1850, y: 135, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1805 },
      { id: 'fb2', x: 2060, y: 135, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 2015 },
      { id: 'h3', x: 2215, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2195, triggerRadius: 65, telegraphTime: 0.16 },
    ],
    checkpoints: [{ id: 'cp1', x: 1650, y: 410, fake: false }],
    signs: [
      { id: 's1', x: 210, y: 420, text: 'Tap Jump Lightly ↑' },
    ],
    fakeRewards: [],
    exits: [{ id: 'e1', x: 2365, y: 410 }],
    adaptiveClue: { x: 380, y: 350, text: 'Spike #1 retracts; spike #2 slides right — stay calm!' },
  },

  {
    // CONCEPT 24: ICE RINK SAW PERCHES + PROXIMITY-SHIFTING BRIDGE!
    id: 24,
    chapter: 5,
    chapterTitle: 'Psychological Warfare',
    levelInChapter: 4,
    name: 'Ice Rink Massacre',
    subtitle: 'Slippery perches over buzzsaws and a bridge that dodges your feet.',
    worldWidth: 2520,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 1120, h: 140, kind: 'ice' },
      { id: 'perch1', x: 420, y: 340, w: 105, h: 20, kind: 'ice' },
      { id: 'perch2', x: 790, y: 340, w: 105, h: 20, kind: 'ice' },
      { id: 'shf1', x: 1255, y: 395, w: 105, h: 22, kind: 'proximity_shift', shiftX: 55, shiftY: 0, triggerDist: 145, shiftSpeed: 330 },
      { id: 'c2', x: 1500, y: 365, w: 96, h: 22, kind: 'crumble', crumbleDelay: 0.34, respawnDelay: 1.9 },
      { id: 'p2', x: 1720, y: 410, w: 800, h: 150, kind: 'ice' },
    ],
    hazards: [
      { id: 'saw1', x: 465, y: 402, w: 36, h: 36, kind: 'saw', moveX: 205, moveY: 0, speed: 2.35 },
      { id: 'saw2', x: 835, y: 402, w: 36, h: 36, kind: 'saw', moveX: 205, moveY: 0, speed: 2.35, phase: 2.8 },
      { id: 'fb1', x: 1950, y: 135, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1905 },
      { id: 'saw3', x: 2150, y: 392, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 85, speed: 2.65 },
    ],
    checkpoints: [
      { id: 'cp_fake', x: 645, y: 420, fake: true, fakeBehavior: 'fly_up', fakeMessage: 'Not today, champ.' },
      { id: 'cp_real', x: 1055, y: 420, fake: false },
    ],
    signs: [
      { id: 's1', x: 195, y: 420, text: 'Use The Icy Perches ↑' },
    ],
    fakeRewards: [
      { id: 'r1', x: 838, y: 295, kind: 'star', prankMessage: 'STILL ZERO RESPECT.' },
    ],
    exits: [{ id: 'e1', x: 2390, y: 410 }],
    adaptiveClue: { x: 1915, y: 345, text: 'Brake early on ice before the crusher & saw!' },
  },

  {
    // CONCEPT 25: ZERO-SPOILER FAKE EXIT #5 (Runaway Door Suddenly Unlocks a 1050px Hidden Minefield!)
    // Camera is locked at x=1700 — player thinks e1 at x=1595 is the real finish!
    id: 25,
    chapter: 5,
    chapterTitle: 'Psychological Warfare',
    levelInChapter: 5,
    name: 'Almost Counts For Nothing',
    subtitle: 'One step from the door... and the whole map stretches out.',
    worldWidth: 2740,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    cameraLocks: [{ triggerId: 'chase_25', maxX: 1700 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 260, h: 140, kind: 'solid' },
      { id: 'm1', x: 430, y: 395, w: 100, h: 22, kind: 'moving', moveX: 90, moveY: 0, speed: 2.15 },
      { id: 'inv1', x: 700, y: 370, w: 92, h: 22, kind: 'invisible' },
      { id: 'c1', x: 935, y: 395, w: 92, h: 22, kind: 'crumble', crumbleDelay: 0.31, respawnDelay: 1.9 },
      { id: 'p2', x: 1170, y: 420, w: 320, h: 140, kind: 'solid' },
      { id: 'fd1', x: 1490, y: 420, w: 105, h: 140, kind: 'solid' },
      { id: 'p2_end', x: 1595, y: 420, w: 105, h: 140, kind: 'solid' },
      // 100% hidden minefield runway revealed only when the door sprouts legs and runs!
      { id: 'p3_hid', x: 1700, y: 420, w: 1040, h: 140, kind: 'solid', revealOnTriggerId: 'chase_25' },
    ],
    hazards: [
      { id: 'saw1_hid', x: 1855, y: 402, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: 2.65, revealOnTriggerId: 'chase_25' },
      { id: 'saw2_hid', x: 2035, y: 402, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: 2.65, phase: 2.4, revealOnTriggerId: 'chase_25' },
      { id: 'h1_hid', x: 2280, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2260, triggerRadius: 65, telegraphTime: 0.16, revealOnTriggerId: 'chase_25' },
      { id: 'h2_hid', x: 2465, y: 396, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2445, triggerRadius: 65, telegraphTime: 0.16, revealOnTriggerId: 'chase_25' },
    ],
    checkpoints: [{ id: 'cp1', x: 1255, y: 420, fake: false }],
    signs: [
      { id: 's1', x: 1435, y: 420, text: 'GG! Touch Door →', flippedText: 'CHASE IT!' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e1',
        x: 1610,
        y: 420,
        triggerDistance: 86,
        fakeMessage: 'THE DOOR BOLTED! A WHOLE NEW TRACK JUST APPEARED!',
        moveTargets: [
          { x: 2170, y: 420, quip: 'Nope! Keep running!', revealsTriggerId: 'chase_25' },
          { x: 2375, y: 420, quip: 'Watch your feet!' },
          { x: 2635, y: 420, quip: 'Alright, I surrender.' },
        ],
      },
    ],
    adaptiveClue: { x: 2230, y: 350, text: 'Two hidden pop-up spikes ambush the door chase!' },
  },

  // =========================================================================
  // CHAPTER 6: ACTUALLY IMPOSSIBLE? (Levels 26 - 30)
  // =========================================================================
  {
    // CONCEPT 26: CONVEYOR SKYWAY + SHRINKING STONES + TAILWIND!
    id: 26,
    chapter: 6,
    chapterTitle: 'The Nightmare',
    levelInChapter: 1,
    name: 'Conveyor Skyway',
    subtitle: 'Opposite belts, shrinking midair blocks, and a pushy tailwind.',
    worldWidth: 2620,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    windZones: [{ minX: 1600, maxX: 2480, forceX: 390 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 230, h: 140, kind: 'solid' },
      { id: 'cv1', x: 365, y: 395, w: 120, h: 22, kind: 'conveyor', conveyorSpeed: -145 },
      { id: 'sh1', x: 615, y: 360, w: 120, h: 22, kind: 'shrink', shrinkRate: 112, respawnDelay: 1.85 },
      { id: 'cv2', x: 865, y: 340, w: 120, h: 22, kind: 'conveyor', conveyorSpeed: 165 },
      { id: 'pb26', x: 1105, y: 375, w: 102, h: 22, kind: 'phase_blink', blinkOnTime: 1.45, blinkOffTime: 0.85, blinkPhase: 0.4 },
      { id: 'p2', x: 1335, y: 410, w: 285, h: 150, kind: 'solid' },
      { id: 'sh2', x: 1760, y: 390, w: 115, h: 22, kind: 'shrink', shrinkRate: 115, respawnDelay: 1.85 },
      { id: 'p3', x: 2005, y: 410, w: 615, h: 150, kind: 'solid' },
    ],
    hazards: [
      { id: 'saw1', x: 785, y: 300, w: 34, h: 34, kind: 'saw', moveX: 0, moveY: 75, speed: 2.5 },
      { id: 'saw2', x: 1530, y: 392, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: 2.7 },
      { id: 'fb1', x: 2165, y: 135, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 2120 },
      { id: 'h1', x: 2325, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2305, triggerRadius: 65, telegraphTime: 0.16 },
    ],
    checkpoints: [{ id: 'cp1', x: 1410, y: 410, fake: false }],
    signs: [
      { id: 's1', x: 155, y: 420, text: 'Watch The Belts →' },
    ],
    fakeRewards: [],
    exits: [{ id: 'e1', x: 2495, y: 410 }],
    adaptiveClue: { x: 2120, y: 345, text: 'Fight the tailwind before baiting the crusher!' },
  },

  {
    // CONCEPT 27: INVERTED CONTROLS + PROXIMITY-SHIFTING LANDING + EVERY ADAPTIVE TRAP!
    id: 27,
    chapter: 6,
    chapterTitle: 'The Nightmare',
    levelInChapter: 2,
    name: 'Controller Insurance Needed',
    subtitle: 'Mid-level inverted controls, shifty platforms, and every adaptive trap armed.',
    worldWidth: 2660,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    reverseControlZones: [{ minX: 1650, maxX: 2460 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 410, h: 140, kind: 'solid' },
      { id: 'p_ad_ceil', x: 195, y: 270, w: 180, h: 24, kind: 'solid', adaptiveCondition: 'jump_spam' },
      { id: 'm1', x: 585, y: 395, w: 96, h: 22, kind: 'moving', moveX: 90, moveY: 0, speed: 2.25 },
      { id: 'shf1', x: 920, y: 365, w: 105, h: 22, kind: 'proximity_shift', shiftX: 55, shiftY: 0, triggerDist: 140, shiftSpeed: 325 },
      { id: 'p2', x: 1210, y: 410, w: 350, h: 150, kind: 'solid' },
      { id: 'fd1', x: 1560, y: 410, w: 115, h: 150, kind: 'fake_drop', triggerDist: 50, dropDistance: 220 },
      { id: 'p3', x: 1675, y: 410, w: 985, h: 150, kind: 'solid' },
    ],
    hazards: [
      { id: 'h_ad_jump', x: 210, y: 294, w: 150, h: 22, kind: 'spike', dir: 'down', adaptiveCondition: 'jump_spam' },
      { id: 'h_ad_camp', x: 140, y: 398, w: 30, h: 30, kind: 'sweeper', moveX: 210, moveY: 0, speed: 1.8, adaptiveCondition: 'camper' },
      { id: 'h_ad_rush', x: 1435, y: 392, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: 2.75, adaptiveCondition: 'rusher' },
      { id: 'h1', x: 1830, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 1810, triggerRadius: 65, telegraphTime: 0.16 },
      { id: 'saw1', x: 2045, y: 392, w: 36, h: 36, kind: 'saw', moveX: 110, moveY: 0, speed: 2.4 },
      { id: 'h2', x: 2305, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2285, triggerRadius: 65, telegraphTime: 0.16 },
    ],
    checkpoints: [{ id: 'cp1', x: 1285, y: 410, fake: false }],
    signs: [
      { id: 's1', x: 1715, y: 410, text: 'Easy Stretch Ahead!', flippedText: 'LEFT = RIGHT!' },
    ],
    fakeRewards: [
      { id: 'r1', x: 2045, y: 300, kind: 'trophy', prankMessage: 'VOIDED YOUR WARRANTY.', triggersBounce: true },
    ],
    exits: [{ id: 'e1', x: 2530, y: 410 }],
    adaptiveClue: { x: 1995, y: 335, text: 'Controls invert on the final strip — jump clean over the saw!' },
  },

  {
    // CONCEPT 28: BLACKOUT SPOTLIGHT + CHASER SAW + ZERO-SPOILER VANISHING FAKE EXIT!
    // Outrun a chaser in the dark to a locked-camera exit... which vanishes and unfolds a hidden finale!
    id: 28,
    chapter: 6,
    chapterTitle: 'The Nightmare',
    levelInChapter: 3,
    name: 'Your Ego Ends Here',
    subtitle: 'Pitch dark, a chaser at your heels, and an exit that isn’t real.',
    worldWidth: 2740,
    worldHeight: 540,
    spawn: { x: 135, y: 370 },
    spotlightRadius: 124,
    darknessFlashInterval: 4.8,
    cameraLocks: [{ triggerId: 'ego_28', maxX: 1650 }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 690, h: 140, kind: 'solid' },
      { id: 'inv1', x: 835, y: 395, w: 88, h: 22, kind: 'invisible' },
      { id: 'c1', x: 1075, y: 370, w: 88, h: 22, kind: 'crumble', crumbleDelay: 0.29, respawnDelay: 1.8 },
      { id: 'p2', x: 1310, y: 420, w: 340, h: 140, kind: 'solid' },
      // 100% hidden final track revealed ONLY when fake exit vanishes in the dark!
      { id: 'p3_hid', x: 1650, y: 420, w: 320, h: 140, kind: 'solid', revealOnTriggerId: 'ego_28' },
      { id: 'c2_hid', x: 2115, y: 395, w: 88, h: 22, kind: 'crumble', crumbleDelay: 0.29, respawnDelay: 1.8, revealOnTriggerId: 'ego_28' },
      { id: 'inv2_hid', x: 2350, y: 375, w: 88, h: 22, kind: 'invisible', revealOnTriggerId: 'ego_28' },
      { id: 'p4_hid', x: 2555, y: 410, w: 185, h: 150, kind: 'solid', revealOnTriggerId: 'ego_28' },
    ],
    hazards: [
      { id: 'chaser_28', x: 18, y: 364, w: 54, h: 54, kind: 'chaser', triggerX: 270, chaseSpeed: 205, chaseMaxX: 1460 },
      { id: 'saw2', x: 475, y: 402, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 90, speed: 2.6, phase: 2.2 },
      { id: 'fb1_hid', x: 1835, y: 135, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1790, revealOnTriggerId: 'ego_28' },
      { id: 'saw3_hid', x: 2260, y: 330, w: 34, h: 34, kind: 'saw', moveX: 0, moveY: 75, speed: 2.55, revealOnTriggerId: 'ego_28' },
    ],
    checkpoints: [
      { id: 'cp_fake', x: 605, y: 420, fake: true, fakeBehavior: 'run_away', fakeMessage: 'Checkpoints are for quitters.' },
      { id: 'cp_real_hid', x: 1730, y: 420, fake: false, revealOnTriggerId: 'ego_28' },
    ],
    signs: [
      { id: 's1', x: 1435, y: 420, text: 'Victory Door!', flippedText: 'Still Trapped.' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e_fake',
        x: 1555,
        y: 420,
        fake: true,
        fakeBehavior: 'vanish',
        approachTriggerDist: 66,
        fakeMessage: 'YOUR EGO IS NOT DONE YET — KEEP GOING IN THE DARK!',
        revealsTriggerId: 'ego_28',
      },
      { id: 'e_real', x: 2655, y: 410, revealOnTriggerId: 'ego_28' },
    ],
    adaptiveClue: { x: 2070, y: 340, text: 'Time the airborne saw between crumble & invisible!' },
  },

  {
    // CONCEPT 29: LOW-GRAVITY CEILING TUNNEL + RISING TRAP ELEVATOR + SLIDING SPIKE!
    id: 29,
    chapter: 6,
    chapterTitle: 'The Nightmare',
    levelInChapter: 4,
    name: '99% Quit Right Before This',
    subtitle: 'Floaty hops under ceiling teeth, a trap lift, and a sliding ambush.',
    worldWidth: 2880,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    gravityScale: 0.78,
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 740, h: 140, kind: 'solid' },
      { id: 'ceil1', x: 220, y: 238, w: 460, h: 24, kind: 'solid' },
      { id: 'c1', x: 885, y: 395, w: 86, h: 22, kind: 'crumble', crumbleDelay: 0.29, respawnDelay: 1.8 },
      { id: 'c2', x: 1125, y: 370, w: 86, h: 22, kind: 'crumble', crumbleDelay: 0.29, respawnDelay: 1.8 },
      { id: 'p2', x: 1365, y: 410, w: 300, h: 150, kind: 'solid' },
      { id: 'el29', x: 1785, y: 400, w: 105, h: 22, kind: 'elevator', moveY: -200, speed: 140 },
      { id: 'ceil_el29', x: 1760, y: 150, w: 155, h: 24, kind: 'solid' },
      { id: 'p3', x: 2050, y: 410, w: 830, h: 150, kind: 'solid' },
    ],
    hazards: [
      { id: 'hc', x: 235, y: 262, w: 430, h: 22, kind: 'spike', dir: 'down' },
      { id: 'hf1', x: 345, y: 396, w: 42, h: 24, kind: 'spike', dir: 'up' },
      { id: 'hf2', x: 545, y: 396, w: 42, h: 24, kind: 'spike', dir: 'up' },
      { id: 'fb1', x: 1535, y: 135, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1490 },
      { id: 'hc_el29', x: 1775, y: 174, w: 125, h: 22, kind: 'spike', dir: 'down' },
      { id: 'saw1', x: 2235, y: 392, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 92, speed: 2.75 },
      { id: 'sl29', x: 2480, y: 386, w: 46, h: 24, kind: 'sliding_spike', dir: 'up', triggerX: 2380, triggerRadius: 90, slideX: -75, slideSpeed: 335 },
    ],
    checkpoints: [{ id: 'cp1', x: 1435, y: 410, fake: false }],
    signs: [
      { id: 's1', x: 160, y: 420, text: 'LOW GRAV · TAP ONLY ↑' },
    ],
    fakeRewards: [],
    exits: [
      {
        id: 'e1',
        x: 2635,
        y: 410,
        triggerDistance: 95,
        moveTargets: [{ x: 2785, y: 410, quip: '1% club awaits!' }],
      },
    ],
    adaptiveClue: { x: 2380, y: 345, text: 'Bail off the trap lift early and leap the sliding spike!' },
  },

  {
    // CONCEPT 30: CHAPTER 6 BOSS — ICE + SHRINK + PHANTOM WALL + ZERO-SPOILER HIDDEN TAILWIND FINALE!
    // Camera locks at x=1615 so players believe the door at x=1520 ends Level 30!
    id: 30,
    chapter: 6,
    chapterTitle: 'The Nightmare',
    levelInChapter: 5,
    name: 'THE FINAL HUMILIATION',
    subtitle: 'Every betrayal combined. Beat this to earn eternal bragging rights.',
    worldWidth: 3140,
    worldHeight: 540,
    spawn: { x: 70, y: 370 },
    cameraLocks: [{ triggerId: 'final_boss_30', maxX: 1615 }],
    windZones: [{ minX: 1950, maxX: 3000, forceX: 340, revealOnTriggerId: 'final_boss_30' }],
    platforms: [
      { id: 'p1', x: 0, y: 420, w: 310, h: 140, kind: 'ice' },
      { id: 'sh1', x: 445, y: 395, w: 112, h: 22, kind: 'shrink', shrinkRate: 118, respawnDelay: 1.8 },
      { id: 'inv1', x: 695, y: 365, w: 86, h: 22, kind: 'invisible' },
      { id: 'c2', x: 935, y: 340, w: 86, h: 22, kind: 'crumble', crumbleDelay: 0.29, respawnDelay: 1.8 },
      { id: 'p2', x: 1175, y: 410, w: 440, h: 150, kind: 'solid' },
      { id: 'p_ad_ceil', x: 1270, y: 265, w: 165, h: 24, kind: 'solid', adaptiveCondition: 'jump_spam' },
      // 100% hidden finale track revealed ONLY when the fake Level 30 exit vanishes!
      { id: 'p3_hid', x: 1615, y: 410, w: 300, h: 150, kind: 'conveyor', conveyorSpeed: 150, revealOnTriggerId: 'final_boss_30' },
      { id: 'm1_hid', x: 2085, y: 390, w: 96, h: 22, kind: 'moving', moveX: 90, moveY: 0, speed: 2.3, revealOnTriggerId: 'final_boss_30' },
      { id: 'pb30_hid', x: 2345, y: 375, w: 96, h: 22, kind: 'phase_blink', blinkOnTime: 1.4, blinkOffTime: 0.85, blinkPhase: 0.2, revealOnTriggerId: 'final_boss_30' },
      { id: 'p4_hid', x: 2575, y: 410, w: 565, h: 150, kind: 'solid', revealOnTriggerId: 'final_boss_30' },
    ],
    hazards: [
      { id: 'h_ad_jump', x: 1285, y: 289, w: 135, h: 22, kind: 'spike', dir: 'down', adaptiveCondition: 'jump_spam' },
      { id: 'h_ad_camp', x: 1215, y: 388, w: 30, h: 30, kind: 'sweeper', moveX: 195, moveY: 0, speed: 1.8, adaptiveCondition: 'camper' },
      { id: 'saw1', x: 1410, y: 392, w: 36, h: 36, kind: 'saw', moveX: 0, moveY: 92, speed: 2.75 },
      { id: 'fb1_hid', x: 1795, y: 130, w: 66, h: 52, kind: 'falling_block', fallTriggerX: 1750, revealOnTriggerId: 'final_boss_30' },
      { id: 'h1_hid', x: 2640, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2620, triggerRadius: 65, telegraphTime: 0.16, revealOnTriggerId: 'final_boss_30' },
      { id: 'h2_hid', x: 2825, y: 386, w: 46, h: 24, kind: 'popup_spike', dir: 'up', triggerX: 2805, triggerRadius: 65, telegraphTime: 0.16, revealOnTriggerId: 'final_boss_30' },
    ],
    checkpoints: [
      { id: 'cp_fake', x: 245, y: 420, fake: true, fakeBehavior: 'fly_up', fakeMessage: 'Level 30? Earn it.' },
      { id: 'cp_real_hid', x: 1695, y: 410, fake: false, revealOnTriggerId: 'final_boss_30' },
    ],
    signs: [
      { id: 's1', x: 155, y: 420, text: 'LEVEL 30 · GOOD LUCK' },
      { id: 's2', x: 1475, y: 410, text: 'YOU WIN!', flippedText: 'NOT YET!' },
    ],
    fakeRewards: [
      { id: 'r1_hid', x: 2745, y: 325, kind: 'trophy', prankMessage: 'CROWN DENIED! TOUCH THE DOOR.', revealOnTriggerId: 'final_boss_30' },
    ],
    exits: [
      {
        id: 'e_fake',
        x: 1525,
        y: 410,
        fake: true,
        fakeBehavior: 'vanish',
        approachTriggerDist: 68,
        fakeMessage: 'FINAL PLOT TWIST! HIDDEN TAILWIND FINALE UNLOCKED!',
        revealsTriggerId: 'final_boss_30',
      },
      {
        id: 'e_real',
        x: 2745,
        y: 410,
        triggerDistance: 95,
        revealOnTriggerId: 'final_boss_30',
        moveTargets: [
          { x: 2920, y: 410, quip: 'Wait for it...' },
          { x: 3035, y: 410, quip: 'OKAY, YOU ARE A LEGEND!' },
        ],
      },
    ],
    adaptiveClue: { x: 2600, y: 340, text: 'Jump BOTH hidden pop-up spikes while chasing the door!' },
  },
];

const CORE_LEVEL_OBJECTIVES: Record<number, string> = {
  1: 'Spot the sudden fake-floor drop and leap to the opening exit.',
  2: 'Resist the shiny decoy coin and jump over the hidden shatter-tile trap.',
  3: 'Chase the sprinting exit door across hidden pop-up spikes without mistiming.',
  4: 'Master zero-friction ice braking before the edge spikes.',
  5: 'Trigger the hidden Act 2 behind the Chapter 1 fake finish line.',
  6: 'Sprint across shrinking stones before they vanish beneath your feet.',
  7: 'Skip the lethal high detour and walk straight through the hollow ink wall.',
  8: 'Bounce up to the hidden upper floor after the lower exit betrays you.',
  9: 'Compensate for disguised conveyor belts pulling you toward blades.',
  10: 'Feather micro-jumps in moon gravity beneath low ceiling spikes.',
  11: 'Break jump-spam habits and step calmly past adaptive ceiling traps.',
  12: 'Predict proximity-shifting ledges that slide away mid-jump.',
  13: 'Trust invisible ghost platforms and ignore retracting decoy spikes.',
  14: 'Adapt smoothly when controls silently invert mid-corridor.',
  15: 'Ignore the fleeing checkpoint and conquer the vanished-exit hidden track.',
  16: 'Bail off rising trap elevators before they crush you into ceiling spikes.',
  17: 'Fight the headwind gap, then brake against the tailwind crusher push.',
  18: 'Navigate pitch-black darkness using tight proximity reveals and micro-flashes.',
  19: 'Outrun the relentless giant chaser saw across crumbling bridges.',
  20: 'Survive twin zero-spoiler vanishing doors and two hidden acts.',
  21: 'Time short heavy-gravity leaps across fast-shrinking ledges.',
  22: 'Read the deceptively familiar Level 1 layout armed with tenfold ambushes.',
  23: 'Thread low ceiling spikes while dodging sliding floor teeth.',
  24: 'Land cleanly on icy perches over saws and a dodging mid-bridge.',
  25: 'Adapt instantly when the map unexpectedly extends at the final step.',
  26: 'Balance opposite conveyor belts, shrinking blocks, and a pushing tailwind.',
  27: 'Survive inverted steering across shifting ledges and armed adaptive traps.',
  28: 'Outrun a chaser in pitch darkness and clear the hidden vanished-exit act.',
  29: 'Combine moon-gravity taps, trap lifts, and sliding spike ambushes.',
  30: 'Conquer the Chapter 6 boss and its zero-spoiler tailwind runaway finale.',
};

const CHAPTER_TITLE_BY_ID = new Map<number, string>(
  CHAPTERS.map((c) => [c.id, c.title]),
);

const LEVEL_100_FINALE: LevelDef = buildLevel100Finale();

export const LEVELS: LevelDef[] = [...CORE_LEVELS, ...EXTENDED_LEVELS].map((lvl) => {
  if (lvl.id === 100) {
    return LEVEL_100_FINALE;
  }
  const chapterTitle = CHAPTER_TITLE_BY_ID.get(lvl.chapter) ?? lvl.chapterTitle;
  const objective = lvl.objective ?? CORE_LEVEL_OBJECTIVES[lvl.id];
  // Strictly strip any adaptiveClue data past Level 50 (Zero Hints on Levels 51–100)
  if (lvl.id > 50) {
    const { adaptiveClue: _omit, tutorialHints: _omitTut, ...clean } = lvl;
    return { ...clean, chapterTitle, objective };
  }
  return { ...lvl, chapterTitle, objective };
});

export function getLevelById(id: number): LevelDef {
  if (id === 100) {
    return LEVEL_100_FINALE;
  }
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
