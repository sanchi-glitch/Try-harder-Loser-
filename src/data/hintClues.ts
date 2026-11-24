import type { DeathCause, DeathCluster, LevelDef } from '../types/game';

export const HINT_SYSTEM_MAX_LEVEL = 50;
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
  isRepeatObstacleFail: boolean;
  obstacleIndex: number;
  clueText: string;
  centerX: number;
  maxX: number;
}

/**
 * Cryptic, sarcastic per-obstacle clues for Levels 1–50.
 * Revealed strictly on the HUD ONLY after 3+ deaths on the same obstacle
 * AND after the player voluntarily completes a Rewarded Ad.
 * Never spoils hidden fake-exit tracks before the player actually reaches them.
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
      maxX: 1470,
      centerX: 1225,
      clueText: 'Full sprint, very edge, no hesitation. The void loves early jumpers.',
    },
    {
      id: 'l3_hidden_canyon',
      minX: 1520,
      maxX: 2100,
      centerX: 1750,
      clueText: 'Bounce right off the cracked stone, then hop the crimson slit before the door.',
    },
  ],
  4: [
    {
      id: 'l4_ice_start',
      minX: 240,
      maxX: 650,
      centerX: 440,
      clueText: 'Waxed ice carries your slide—jump early before the spike and tap left to brake.',
    },
    {
      id: 'l4_ice_mid',
      minX: 650,
      maxX: 1000,
      centerX: 810,
      clueText: 'Control your momentum on the glossy island before launching to solid ground.',
    },
    {
      id: 'l4_ice_end',
      minX: 1140,
      maxX: 1740,
      centerX: 1410,
      clueText: 'Counter-tap left to slow down on ice, then clear the red seam and final spike.',
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
      id: 'l6_shrink_chain',
      minX: 230,
      maxX: 1120,
      centerX: 640,
      clueText: 'Those ledges shrink the instant you land—bounce forward without pausing.',
    },
    {
      id: 'l6_late_shrink',
      minX: 1320,
      maxX: 1720,
      centerX: 1525,
      clueText: 'One more rapidly shrinking stone. Full running jump, zero hesitation.',
    },
    {
      id: 'l6_popup',
      minX: 1700,
      maxX: 1860,
      centerX: 1775,
      clueText: 'Landed safely? Wrong. Hop the red floor scratch before celebrating.',
      causes: ['popup_spike'],
    },
  ],
  7: [
    {
      id: 'l7_phantom_wall',
      minX: 430,
      maxX: 920,
      centerX: 690,
      clueText: 'Stop climbing the spiked bait route—walk straight through the black wall.',
    },
    {
      id: 'l7_crumble',
      minX: 1140,
      maxX: 1520,
      centerX: 1335,
      clueText: 'Touch, launch, repeat. Hesitating on cracked ink is a hobby you should quit.',
    },
    {
      id: 'l7_crusher_spike',
      minX: 1520,
      maxX: 1890,
      centerX: 1715,
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
      id: 'l8_sky_track',
      minX: 1090,
      maxX: 1880,
      centerX: 1470,
      clueText: 'Slip past the rising sky saw and chain both cracked ledges without slowing.',
    },
    {
      id: 'l8_popup',
      minX: 1850,
      maxX: 2040,
      centerX: 1935,
      clueText: 'Touch down on the upper ledge ready to hop the crimson floor seam.',
      causes: ['popup_spike'],
    },
  ],
  9: [
    {
      id: 'l9_disguised_belts',
      minX: 210,
      maxX: 960,
      centerX: 560,
      clueText: 'Hidden conveyors shove you—jump early off the first belt and sprint against the second.',
    },
    {
      id: 'l9_mid_popup',
      minX: 1020,
      maxX: 1240,
      centerX: 1130,
      clueText: 'Solid land holds a grudge too. Hop the crimson slit past the checkpoint.',
      causes: ['popup_spike'],
    },
    {
      id: 'l9_late_belts',
      minX: 1280,
      maxX: 1980,
      centerX: 1680,
      clueText: 'Ride the forward belt’s speed, then fight the hidden reverse belt under the rising saw.',
    },
  ],
  10: [
    {
      id: 'l10_low_grav_1',
      minX: 260,
      maxX: 820,
      centerX: 540,
      clueText: 'Low gravity turns held jumps into ceiling haircuts—feather-tap jump lightly.',
    },
    {
      id: 'l10_mid_float',
      minX: 820,
      maxX: 1640,
      centerX: 1240,
      clueText: 'Ignore the coin bait and stay low beneath the second spiked roof.',
    },
    {
      id: 'l10_end_popup',
      minX: 1750,
      maxX: 2120,
      centerX: 1905,
      clueText: 'Short-hop the crimson seam before chasing the scooting door.',
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
      id: 'l12_shifty_1',
      minX: 300,
      maxX: 730,
      centerX: 500,
      clueText: 'That platform scoots right as you near—bait the shift or overshoot onto its new spot.',
    },
    {
      id: 'l12_shifty_2',
      minX: 1060,
      maxX: 1430,
      centerX: 1240,
      clueText: 'This ledge drops downward when approached—wait a beat or adjust your arc.',
    },
    {
      id: 'l12_end_popup',
      minX: 1450,
      maxX: 1880,
      centerX: 1600,
      clueText: 'Clear the red floor scar before chasing the scooting exit.',
      causes: ['popup_spike'],
    },
  ],
  13: [
    {
      id: 'l13_invis_trio',
      minX: 260,
      maxX: 1070,
      centerX: 675,
      clueText: 'Squint at the faint dashed ghosts—they hold weight even if your trust doesn’t.',
    },
    {
      id: 'l13_retract_combo',
      minX: 1120,
      maxX: 1420,
      centerX: 1255,
      clueText: 'Walk over the shy retracting spike, then jump the real red slit right after it.',
    },
    {
      id: 'l13_end_invis',
      minX: 1420,
      maxX: 1930,
      centerX: 1680,
      clueText: 'Time the blinking slab’s solid window, then aim for the faint dashed ghost.',
    },
  ],
  14: [
    {
      id: 'l14_invis_mix',
      minX: 340,
      maxX: 930,
      centerX: 640,
      clueText: 'The sign says NO FLOOR because it’s a liar. Follow the ghost ledge and cracked step.',
    },
    {
      id: 'l14_inverted_saw',
      minX: 1070,
      maxX: 1520,
      centerX: 1265,
      clueText: 'Past the sign, Left and Right swap—hold Left to move forward under the rising blade.',
    },
    {
      id: 'l14_inverted_end',
      minX: 1520,
      maxX: 2060,
      centerX: 1790,
      clueText: 'Still inverted! Bait the falling block with reversed steering, then hop the spike.',
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
      id: 'l16_bounce',
      minX: 280,
      maxX: 540,
      centerX: 410,
      clueText: 'The angled spring flings you forward—tap left in midair to land cleanly.',
    },
    {
      id: 'l16_elevator',
      minX: 700,
      maxX: 960,
      centerX: 805,
      clueText: 'Bail right off the rising lift onto the upper ledge before kissing the ceiling spikes.',
    },
    {
      id: 'l16_hidden_sky',
      minX: 1200,
      maxX: 2010,
      centerX: 1620,
      clueText: 'Chain both cracked stones, then leap the crimson seam right after landing.',
    },
  ],
  17: [
    {
      id: 'l17_headwind',
      minX: 250,
      maxX: 920,
      centerX: 575,
      clueText: 'Strong headwind steals range—leap from the very edge and time the midair blade.',
    },
    {
      id: 'l17_tailwind_drop',
      minX: 1210,
      maxX: 1560,
      centerX: 1350,
      clueText: 'Tailwind launches you fast—vault the dropping seam without overshooting.',
    },
    {
      id: 'l17_crusher_popup',
      minX: 1560,
      maxX: 1990,
      centerX: 1740,
      clueText: 'Hold left against the tailwind to bait the crusher, then hop the crimson slit.',
    },
  ],
  18: [
    {
      id: 'l18_dark_drop',
      minX: 180,
      maxX: 460,
      centerX: 290,
      clueText: 'Wait for the brief flash—there is a concealed drop right before the moving slab.',
    },
    {
      id: 'l18_dark_shuttles',
      minX: 460,
      maxX: 1120,
      centerX: 780,
      clueText: 'Let the dark shuttle glide into your beam, then aim ahead of the shifting ledge.',
    },
    {
      id: 'l18_mid_popup_crumble',
      minX: 1120,
      maxX: 1785,
      centerX: 1460,
      clueText: 'Step on LIGHTS for a power-surge flash, hop the red seam, and time the blinking bridge.',
    },
    {
      id: 'l18_dark_finale',
      minX: 1785,
      maxX: 2220,
      centerX: 1995,
      clueText: 'Bait the dark ceiling crusher first, skip the trophy bait, and leap the final red slit.',
    },
  ],
  19: [
    {
      id: 'l19_chaser_bridge',
      minX: 240,
      maxX: 1020,
      centerX: 650,
      clueText: 'Never hesitate—keep ahead of the pursuing saw across the cracked and ghost ledges.',
    },
    {
      id: 'l19_ceil_sprint',
      minX: 1380,
      maxX: 1800,
      centerX: 1610,
      clueText: 'Obey the sign: sprint flat beneath the ceiling teeth without tapping jump.',
    },
    {
      id: 'l19_spike_crusher',
      minX: 1800,
      maxX: 2180,
      centerX: 1960,
      clueText: 'Clear the floor spike cleanly and keep moving past the falling slab.',
    },
  ],
  20: [
    {
      id: 'l20_early_crumble',
      minX: 270,
      maxX: 660,
      centerX: 470,
      clueText: 'One quick cracked bridge—touch it lightly and spring onto solid land.',
    },
    {
      id: 'l20_saw_moving',
      minX: 1100,
      maxX: 1760,
      centerX: 1440,
      clueText: 'Dash beneath the rising saw, then let the shuttle glide close before leaping.',
    },
    {
      id: 'l20_end_crusher_popup',
      minX: 2020,
      maxX: 2420,
      centerX: 2215,
      clueText: 'Bait the sky-crusher to slam first, then vault the crimson floor seam.',
    },
  ],
  21: [
    {
      id: 'l21_heavy_chain',
      minX: 220,
      maxX: 1030,
      centerX: 620,
      clueText: 'Heavy gravity cuts airtime—sprint to the very lip of every cracked and shrinking stone.',
    },
    {
      id: 'l21_saw_shrink',
      minX: 1140,
      maxX: 1860,
      centerX: 1500,
      clueText: 'Slip under the rising blade, adjust your jump weight if the switch fires, and watch the ceiling ahead.',
    },
    {
      id: 'l21_double_popup',
      minX: 1850,
      maxX: 2140,
      centerX: 1985,
      clueText: 'Two red slits waiting on the finish stretch. Land ready to double-hop.',
      causes: ['popup_spike'],
    },
  ],
  22: [
    {
      id: 'l22_sliding_spike',
      minX: 400,
      maxX: 700,
      centerX: 575,
      clueText: 'That floor spike slides left to intercept gap #1—land late or hop cleanly over it.',
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
      minX: 1200,
      maxX: 2340,
      centerX: 1760,
      clueText: 'Watch the conveyor speed under the saw, then chain the cracked stone, shuttle, and final seam.',
    },
  ],
  23: [
    {
      id: 'l23_short_hop_tunnel',
      minX: 250,
      maxX: 940,
      centerX: 560,
      clueText: 'Spike #1 ducks away harmlessly; spike #2 slides right—feather-tap jump under the roof.',
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
      id: 'l24_ice_perches',
      minX: 240,
      maxX: 1080,
      centerX: 650,
      clueText: 'Use the icy perches above the patrolling saws—tap back early so you don’t slide off.',
    },
    {
      id: 'l24_shifty_crumble',
      minX: 1120,
      maxX: 1735,
      centerX: 1420,
      clueText: 'The first bridge shifts right on approach—aim ahead, then spring off the cracked slab.',
    },
    {
      id: 'l24_crusher_saw',
      minX: 1830,
      maxX: 2320,
      centerX: 2050,
      clueText: 'Brake early on the ice to bait the crusher, then slip under the rising blade.',
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
      id: 'l25_hidden_saws',
      minX: 1720,
      maxX: 2160,
      centerX: 1945,
      clueText: 'Weave beneath both vertical saws as they climb—don’t panic-sprint into steel.',
    },
    {
      id: 'l25_chase_popups',
      minX: 2180,
      maxX: 2640,
      centerX: 2375,
      clueText: 'Stop tunnel-visioning on the fleeing door—two red seams hide along the chase.',
    },
  ],
  26: [
    {
      id: 'l26_conveyor_skyway',
      minX: 210,
      maxX: 1350,
      centerX: 780,
      clueText: 'Sprint against belt #1, bounce off the shrinking block, and ride belt #2’s boost.',
    },
    {
      id: 'l26_saw_shrink',
      minX: 1450,
      maxX: 2020,
      centerX: 1735,
      clueText: 'Duck beneath the rising blade and time the blinking stone cleanly in the tailwind.',
    },
    {
      id: 'l26_end_gauntlet',
      minX: 2020,
      maxX: 2470,
      centerX: 2245,
      clueText: 'Hold left against the tailwind to bait the crusher, then vault the crimson slit.',
    },
  ],
  27: [
    {
      id: 'l27_shuttle_shift',
      minX: 380,
      maxX: 1225,
      centerX: 800,
      clueText: 'Ride the shuttle close, then overshoot onto where the shifty ledge slides right.',
    },
    {
      id: 'l27_drop_invert',
      minX: 1490,
      maxX: 1940,
      centerX: 1710,
      clueText: 'Leap the loose seam—then remember Left & Right swap inside the red border!',
    },
    {
      id: 'l27_inverted_end',
      minX: 1940,
      maxX: 2480,
      centerX: 2195,
      clueText: 'Skip the shiny trap trophy and steer reversed cleanly over the floor saw and final seam.',
    },
  ],
  28: [
    {
      id: 'l28_dark_chaser',
      minX: 210,
      maxX: 1325,
      centerX: 820,
      clueText: 'Keep sprinting ahead of the chaser in the dark—commit smoothly to the ghost and cracked ledges.',
    },
    {
      id: 'l28_hidden_crusher_sky',
      minX: 1720,
      maxX: 2620,
      centerX: 2180,
      clueText: 'Bait the crusher in the dark, then time the midair saw between the cracked and ghost stones.',
    },
  ],
  29: [
    {
      id: 'l29_low_grav_tunnel',
      minX: 190,
      maxX: 750,
      centerX: 445,
      clueText: 'Low gravity + spiky roof: feather-tap jump barely enough to clear each floor tooth.',
    },
    {
      id: 'l29_crumbles_elevator',
      minX: 750,
      maxX: 2060,
      centerX: 1480,
      clueText: 'Chain both cracked blocks, bait the crusher, and bail right off the rising trap lift.',
    },
    {
      id: 'l29_final_sliding',
      minX: 2060,
      maxX: 2740,
      centerX: 2430,
      clueText: 'Slip under the saw and watch for the floor spike sliding left before the door scoots.',
    },
  ],
  30: [
    {
      id: 'l30_opening_sky',
      minX: 240,
      maxX: 1190,
      centerX: 735,
      clueText: 'Launch off the ice onto the shrinking stone, dashed ghost, and cracked slab without pausing.',
    },
    {
      id: 'l30_mid_saw',
      minX: 1190,
      maxX: 1580,
      centerX: 1385,
      clueText: 'Avoid camping or jump-spamming, and slip neatly beneath the rising vertical blade.',
    },
    {
      id: 'l30_hidden_belt_moving',
      minX: 1620,
      maxX: 2590,
      centerX: 2140,
      clueText: 'Bait the crusher on the conveyor, ride the shuttle in the tailwind, and time the blinking bridge.',
    },
    {
      id: 'l30_final_chase',
      minX: 2580,
      maxX: 3040,
      centerX: 2770,
      clueText: 'Skip the fake crown—two hidden crimson seams wait along the fleeing door’s path.',
    },
  ],
  31: [
    {
      id: 'l31_ice',
      minX: 180,
      maxX: 1650,
      centerX: 820,
      clueText: 'Tap back early on glossy ice—leap the sliding spike and ride the icy perch over the floor blade.',
    },
    {
      id: 'l31_ice_end',
      minX: 1650,
      maxX: 2500,
      centerX: 2050,
      clueText: 'Brake on the final ice strip before stepping onto the hidden crimson seam.',
    },
  ],
  32: [
    {
      id: 'l32_sw1',
      minX: 150,
      maxX: 980,
      centerX: 520,
      clueText: 'That first red plate actually builds your way across—don’t stare at the gap forever.',
    },
    {
      id: 'l32_sw2',
      minX: 980,
      maxX: 2250,
      centerX: 1450,
      clueText: 'Not every switch is your friend—watch the floor lip and read the blinking beat ahead.',
    },
  ],
  33: [
    {
      id: 'l33_chaser',
      minX: 180,
      maxX: 1350,
      centerX: 720,
      clueText: 'Never hesitate—stay ahead of the pursuing blade across the cracked and dashed ghost ledges.',
    },
    {
      id: 'l33_tunnel',
      minX: 1350,
      maxX: 2400,
      centerX: 1750,
      clueText: 'Sprint flat beneath the ceiling teeth without jumping, then clear the floor spike and crusher.',
    },
  ],
  34: [
    {
      id: 'l34_phase1',
      minX: 220,
      maxX: 1200,
      centerX: 660,
      clueText: 'Phase blocks flicker red right before vanishing—move with the rhythm instead of guessing.',
    },
    {
      id: 'l34_phase2',
      minX: 1200,
      maxX: 2400,
      centerX: 1750,
      clueText: 'Wait out the blinking beat cleanly and don’t linger on the shrinking landing.',
    },
  ],
  35: [
    {
      id: 'l35_early',
      minX: 200,
      maxX: 1100,
      centerX: 640,
      clueText: 'Bounce cleanly off the cracked stone and slip beneath the vertical saw as it climbs.',
    },
    {
      id: 'l35_hidden',
      minX: 1100,
      maxX: 2400,
      centerX: 1650,
      clueText: 'Launch off the revealed bounce pad and keep moving across the shrinking and invisible sky stones.',
    },
  ],
  36: [
    {
      id: 'l36_heavy',
      minX: 180,
      maxX: 1150,
      centerX: 620,
      clueText: 'Heavy boots cut air time early—jump from the very lip across both unsteady stones.',
    },
    {
      id: 'l36_grav_flip',
      minX: 1150,
      maxX: 2400,
      centerX: 1750,
      clueText: 'Once gravity flips lighter, stop holding jump—feather tiny taps under the roof.',
    },
  ],
  37: [
    {
      id: 'l37_lowgrav',
      minX: 200,
      maxX: 1450,
      centerX: 760,
      clueText: 'Low gravity sends held jumps straight into ceiling spikes—feather-tap jump barely over each tooth.',
    },
    {
      id: 'l37_end',
      minX: 1450,
      maxX: 2650,
      centerX: 2050,
      clueText: 'Stay low under roof #3 to hop the red seam, then tease the falling slab before finishing.',
    },
  ],
  38: [
    {
      id: 'l38_phantom',
      minX: 350,
      maxX: 1100,
      centerX: 670,
      clueText: 'Ignore the spiked upper detour—walk straight through the hollow black wall.',
    },
    {
      id: 'l38_phantom2',
      minX: 1100,
      maxX: 2250,
      centerX: 1700,
      clueText: 'Bait the crusher, walk through the second fake black wall, and hop the red slit past it.',
    },
  ],
  39: [
    {
      id: 'l39_ice_phase',
      minX: 180,
      maxX: 1050,
      centerX: 580,
      clueText: 'Control your ice slide first, then sync your leaps with the alternating phase blocks.',
    },
    {
      id: 'l39_chaos_end',
      minX: 1050,
      maxX: 2250,
      centerX: 1550,
      clueText: 'Fight the sneaky belt, tap the escape plate, and stay sharp on landing.',
    },
  ],
  40: [
    {
      id: 'l40_act1',
      minX: 220,
      maxX: 1050,
      centerX: 620,
      clueText: 'Touch and spring off the cracked slab cleanly—hesitation feeds the void.',
    },
    {
      id: 'l40_late',
      minX: 1050,
      maxX: 3400,
      centerX: 2200,
      clueText: 'Time the saw and shuttle, bait the conveyor crusher, and leap both crimson seams chasing the door.',
    },
  ],
  41: [
    {
      id: 'l41_heavy',
      minX: 200,
      maxX: 1350,
      centerX: 740,
      clueText: 'Lead-boots gravity slashes hang time—jump from the absolute brink of every stone.',
    },
    {
      id: 'l41_end',
      minX: 1350,
      maxX: 2600,
      centerX: 1850,
      clueText: 'Chain the ghost and cracked ledges, then watch for the floor spike sliding left on landing.',
    },
  ],
  42: [
    {
      id: 'l42_headwind',
      minX: 200,
      maxX: 1050,
      centerX: 620,
      clueText: 'Headwind eats short jumps—run to the lip and time the midair blade cleanly.',
    },
    {
      id: 'l42_tailwind',
      minX: 1050,
      maxX: 2450,
      centerX: 1650,
      clueText: 'Tailwind flings you forward—vault the loose floor seam and hold left to brake before the crusher and saw.',
    },
  ],
  43: [
    {
      id: 'l43_phase1',
      minX: 220,
      maxX: 1200,
      centerX: 680,
      clueText: 'Read the red flicker on each disappearing block and slip past the blade between beats.',
    },
    {
      id: 'l43_phase2',
      minX: 1200,
      maxX: 2450,
      centerX: 1750,
      clueText: 'Time the second blinking jump cleanly—the shrinking stone ahead won’t wait for you.',
    },
  ],
  44: [
    {
      id: 'l44_invert1',
      minX: 220,
      maxX: 1300,
      centerX: 880,
      clueText: 'Past the friendly sign, Left and Right swap—hold Left to steer forward under the rising saw.',
    },
    {
      id: 'l44_invert2',
      minX: 1300,
      maxX: 2350,
      centerX: 1750,
      clueText: 'Still inverted inside the red frame! Bait the crusher carefully, then hop both spikes.',
    },
  ],
  45: [
    {
      id: 'l45_lift1',
      minX: 220,
      maxX: 1200,
      centerX: 760,
      clueText: 'Rein in the angled bounce, then bail right off the rising elevator before hitting ceiling spikes.',
    },
    {
      id: 'l45_lift2',
      minX: 1200,
      maxX: 2550,
      centerX: 1780,
      clueText: 'Spring off the cracked stone onto lift #2, bail early onto the high deck, and hop the crimson slit.',
    },
  ],
  46: [
    {
      id: 'l46_sw1',
      minX: 150,
      maxX: 980,
      centerX: 520,
      clueText: 'Step on plate #1 to summon your crossing—staring at the pit won’t build a bridge.',
    },
    {
      id: 'l46_sw2',
      minX: 980,
      maxX: 2600,
      centerX: 1660,
      clueText: 'Don’t trust plate #2’s floor—hop early onto the alternating blinking stones past the saw.',
    },
  ],
  47: [
    {
      id: 'l47_ice',
      minX: 200,
      maxX: 1600,
      centerX: 850,
      clueText: 'Tap back before jumping on waxed ice—dodge the sliding spike and perch above the ground saw.',
    },
    {
      id: 'l47_end',
      minX: 1600,
      maxX: 2550,
      centerX: 2050,
      clueText: 'Control your slide onto the final icy strip and jump early over the crimson seam.',
    },
  ],
  48: [
    {
      id: 'l48_decoy',
      minX: 200,
      maxX: 1200,
      centerX: 560,
      clueText: 'Ignore the retracting decoy spike—save your hop for the real pop-up seam behind it.',
    },
    {
      id: 'l48_slide',
      minX: 1200,
      maxX: 2550,
      centerX: 1850,
      clueText: 'Read both sliding floor spikes and tease the ceiling crusher before rushing past.',
    },
  ],
  49: [
    {
      id: 'l49_chaser',
      minX: 180,
      maxX: 1450,
      centerX: 760,
      clueText: 'Keep full momentum ahead of the chaser saw across the cracked and ghost ledges.',
    },
    {
      id: 'l49_ceil',
      minX: 1450,
      maxX: 2550,
      centerX: 1850,
      clueText: 'Run flat under the spiky roof without jumping, then hop the floor spike and clear the crusher.',
    },
  ],
  50: [
    {
      id: 'l50_boss_start',
      minX: 220,
      maxX: 1150,
      centerX: 650,
      clueText: 'Halfway boss: bounce cleanly off the cracked block and stay sharp—nothing here is forgiving.',
    },
    {
      id: 'l50_boss_late',
      minX: 1150,
      maxX: 3550,
      centerX: 2250,
      clueText: 'Control your slide on the icy stretch, ride the shuttle, bait the belt crusher, and jump both red seams.',
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
 * Resolves the cryptic, sarcastic clue for Levels 1–50 after the player dies
 * (strictly disabled on Levels 51+ and hidden before the first death on a level).
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

  for (let idx = 0; idx < zones.length; idx++) {
    const zone = zones[idx];
    const count = getZoneDeathCount(levelDef.id, zone.minX, zone.maxX, zone.causes);
    if (count < 1) continue;
    const isRepeat = count >= HINT_MIN_OBSTACLE_DEATHS;
    const item: ResolvedObstacleHint = {
      obstacleKey: `lv${levelDef.id}:${zone.id}`,
      deathsOnObstacle: count,
      isRepeatObstacleFail: isRepeat,
      obstacleIndex: idx,
      clueText: zone.clueText,
      centerX: zone.centerX,
      maxX: zone.maxX,
    };
    if (isRepeat) {
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
    const isRepeat = cluster.count >= HINT_MIN_OBSTACLE_DEATHS;
    const approxIndex = Math.max(
      0,
      Math.floor((cluster.x / Math.max(1, levelDef.worldWidth)) * Math.max(1, zones.length)),
    );
    const item: ResolvedObstacleHint = {
      obstacleKey: `lv${levelDef.id}:cluster_${bucket}`,
      deathsOnObstacle: cluster.count,
      isRepeatObstacleFail: isRepeat,
      obstacleIndex: approxIndex,
      clueText: buildFallbackClue(cluster.dominantCause ?? 'pit', levelDef),
      centerX: cluster.x,
      maxX: cluster.x + 120,
    };
    if (isRepeat) {
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
  // provide the level's signature cryptic clue for the upcoming stretch (never marked as 3+ repeat fail).
  const upcomingIndex = zones.findIndex((z) => playerX <= z.maxX + 120);
  const resolvedIndex = upcomingIndex >= 0 ? upcomingIndex : Math.max(0, zones.length - 1);
  const upcomingZone = zones[resolvedIndex] ?? null;

  if (upcomingZone) {
    return {
      obstacleKey: `lv${levelDef.id}:${upcomingZone.id}`,
      deathsOnObstacle: effectiveDeaths,
      isRepeatObstacleFail: false,
      obstacleIndex: resolvedIndex,
      clueText: upcomingZone.clueText,
      centerX: upcomingZone.centerX,
      maxX: upcomingZone.maxX,
    };
  }

  const hottest = deathClusters[0];
  return {
    obstacleKey: `lv${levelDef.id}:level_clue`,
    deathsOnObstacle: effectiveDeaths,
    isRepeatObstacleFail: Boolean(hottest && hottest.count >= HINT_MIN_OBSTACLE_DEATHS),
    obstacleIndex: 0,
    clueText: buildFallbackClue(hottest?.dominantCause ?? 'pit', levelDef),
    centerX: hottest?.x ?? playerX,
    maxX: levelDef.worldWidth,
  };
}

/**
 * Returns the primary cryptic, sarcastic hint for a level in Levels 1–50
 * when the player opens the Get Hint modal from the top HUD toolbar.
 */
export function getPrimaryLevelHint(levelDef: LevelDef): ResolvedObstacleHint | null {
  if (levelDef.id < 1 || levelDef.id > HINT_SYSTEM_MAX_LEVEL) {
    return null;
  }

  const zones = LEVEL_HINT_ZONES[levelDef.id] ?? [];
  const firstZone = zones[0] ?? null;
  if (firstZone) {
    return {
      obstacleKey: `lv${levelDef.id}:${firstZone.id}`,
      deathsOnObstacle: 0,
      isRepeatObstacleFail: false,
      obstacleIndex: 0,
      clueText: firstZone.clueText,
      centerX: firstZone.centerX,
      maxX: firstZone.maxX,
    };
  }

  return {
    obstacleKey: `lv${levelDef.id}:level_clue`,
    deathsOnObstacle: 0,
    isRepeatObstacleFail: false,
    obstacleIndex: 0,
    clueText:
      levelDef.adaptiveClue?.text ??
      'Full speed to the very lip, then hold jump—air is not a load-bearing floor.',
    centerX: levelDef.spawn.x,
    maxX: levelDef.worldWidth,
  };
}
