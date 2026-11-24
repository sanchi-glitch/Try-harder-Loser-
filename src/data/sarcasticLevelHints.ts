/**
 * Sarcastic, ragebait-style level-specific hints for Levels 1–50.
 * Kept cleanly separated from rendering and selection logic.
 *
 * Guidelines:
 * - Strictly Levels 1–50 only (Levels 51+ intentionally have zero hints).
 * - Short, mocking, provocative clues that reference each level's actual mechanics
 *   without revealing exact solutions or spoiling hidden fake-exit tracks early.
 */

export const SARCASTIC_HINT_MAX_LEVEL = 50;
export const SARCASTIC_HINT_MIN_OBSTACLE_DEATHS = 3;

export const SARCASTIC_LEVEL_HINTS: Readonly<Record<number, readonly string[]>> = {
  1: [
    'Aww, that jump really defeated you?',
    'You trusted the floor. Adorable.',
    'You really believed a sign bragging "100% Solid"? Embarrassing.',
  ],
  2: [
    'Ooh, shiny trophy! Still falling for obvious bait, huh?',
    'Still scared of Level 1’s marked tile? Look at its quiet neighbor.',
    'Have you considered that the obvious path might be stupid?',
    'That faint red scratch on the ground isn’t modern art, genius.',
  ],
  3: [
    'Three tries and a slightly taller ledge is winning? Impressive.',
    'Even the checkpoint flag had trust issues with you.',
    'Those floor teeth aren’t decorative. Maybe watch your hops.',
    "The exit isn't going anywhere. Well... actually, it might.",
  ],
  4: [
    'Friction filed for divorce and you still refuse to brake early.',
    'Sliding face-first into a spike on waxed ice? Iconic.',
    'Maybe tap the opposite direction before your boots skate off the ledge.',
  ],
  5: [
    'The platform moves. Your timing apparently doesn’t.',
    'That spinning blade climbs and drops. Your face just drops.',
    'Landed safely—except for the angry red sliver waiting there.',
  ],
  6: [
    'Those wide ledges are on an aggressive diet—stop treating them like a couch.',
    'Standing still on a shrinking stone is a bold strategy. Terrible results.',
    'You survived four vanishing rocks only to step on a red floor scratch.',
  ],
  7: [
    'That checkpoint literally flew away to avoid being seen with you.',
    'Risking your life on that spiked upper detour? Ever tried walking forward?',
    'Not every solid-looking black wall actually exists, genius.',
  ],
  8: [
    'Waiting for the shuttle to actually arrive is free, you know.',
    'Two cracked ledges in a row and you’re still stopping to sightsee.',
    'That midair blade has a rhythm. Your jumping clearly does not.',
  ],
  9: [
    'The floor is secretly a treadmill and you’re still jogging into spikes.',
    'Fighting a backward belt with tiny hops? Adorable cardio session.',
    'Wait for the blade to climb—the floor under you isn’t going to hold still.',
  ],
  10: [
    'Moon gravity turns your full jump into a ceiling-spike haircut.',
    'Tap jump lightly, astronaut—you’re floating straight into steel.',
    'Even the finish line scoots faster than you fall in low gravity.',
  ],
  11: [
    'Interesting strategy. Have you tried NOT pressing jump for once?',
    'Every sign here is lying to your thumb—and you keep listening.',
    'Ceiling spikes exist solely because you can’t stop hopping.',
  ],
  12: [
    'Perhaps that platform has a personality.',
    'Keep spamming jump or camping and watch what spawns just for you.',
    'Even the platforms want personal space from your gameplay.',
  ],
  13: [
    'Squint harder—those faint dashed outlines aren’t dust on your screen.',
    'That first spike is shy and ducks away. Save your panic-jump for its friend.',
    'Jumped over a retracting decoy straight onto a real pop-up blade? Classic.',
  ],
  14: [
    'Left is right, right is wrong, and your brain is visibly buffering.',
    'Watch the red border—your controls quietly swapped right after that sign.',
    'Walked backward straight into a crusher? Peak comedic timing.',
  ],
  15: [
    'That checkpoint grew legs just to escape your gameplay.',
    'Two blades, one shuttle, and a red floor slit waiting at touchdown.',
    'Hesitating on cracked stone? Gravity sends its warmest regards.',
  ],
  16: [
    'Still getting flung into the abyss by that spring? Use your left thumb, idiot.',
    'Ride the trap elevator one second too long and become ceiling art again. Pathetic.',
    'Two cracked stones and one red seam left—try not to choke like usual.',
  ],
  17: [
    'Headwind steals your jump and you STILL leap early? Hopeless.',
    'Now the tailwind is shoving your face straight into a crusher. Brake, idiot.',
    'The wind shifted halfway through and your brain still hasn’t caught up.',
  ],
  18: [
    'Wait for the power flash next time—walking blind into a hollow floor is tragic.',
    'Perhaps that dark platform has a personality. Watch the silhouettes before jumping.',
    'Hit LIGHTS for a flash, memorize the blinking bridge, and don’t ignore the ceiling.',
  ],
  19: [
    'Stop admiring the scenery—a giant red saw is shredding your heels, loser.',
    'Even when a sign begs "DON’T JUMP," your panic thumb ruins everything.',
    'Outran the chaser only to donate your skull to a ceiling crusher. Tragic.',
  ],
  20: [
    'Cracked stone, saw, shuttle—and your reflexes are already disintegrating.',
    'Bait the ceiling crusher before sprinting straight into that red floor seam, idiot.',
    'The quit button is top right—honestly, it might be your best move here.',
  ],
  21: [
    'Lead boots cut your airtime in half and you STILL jump short. Embarrassing.',
    'Heavy gravity plus shrinking stones—zero room for slow brains like yours.',
    'Survived the heavy jumps only to impale yourself on twin red seams. Pathetic.',
  ],
  22: [
    'Looks like Level 1, except that spike slides left to humiliate your landing.',
    'Same "100% Solid" sign, same trap, same gullible idiot falling for it.',
    'Belt, blade, cracked stone, shuttle—déjà vu with teeth, and you’re losing badly.',
  ],
  23: [
    'Holding jump under a spiky roof? Bold of you to keep donating your scalp.',
    'First spike ducks harmlessly; the second slides to hunt you. Wake up, loser.',
    'Two ghost ledges and twin crushers later, you’re STILL sprinting blind.',
  ],
  24: [
    'Icy perches beat walking straight into buzzsaws—try using basic logic.',
    'That bridge literally dodges you on sight. Adjust your leap or keep dying.',
    'Zero brakes on glossy ice right into a crusher and blade. Pure comedy.',
  ],
  25: [
    'Shuttle to ghost to cracked stone—and you’re STILL guessing like an amateur.',
    'Two vertical saws in a row and you chose the single worst beat. Classic loser.',
    'Too busy chasing the door to notice twin red scars waiting to skewer you?',
  ],
  26: [
    'Opposite belts and shrinking midair blocks—way out of your league already?',
    'A tailwind is literally pushing you into a sky crusher and you refuse to brake.',
    'Fight the gust, bait the slab, hop the seam. Not that you’ll pull it off.',
  ],
  27: [
    'Every adaptive trap is awake, plus a shifty ledge—and you’re folding instantly.',
    'Notice the red frame? Left and right flipped, and your brain flatlined.',
    'Ignore the trap trophy and steer reversed over the blade—try not to embarrass yourself.',
  ],
  28: [
    'Pitch dark AND a chaser saw at your back—hesitate once and you’re shredded.',
    'Even the checkpoint fled in the dark rather than be associated with you.',
    'Airborne blade between a cracked stone and a ghost ledge. Quit while you can.',
  ],
  29: [
    '99% quit here—mostly idiots holding jump into low-gravity ceiling spikes.',
    'Bail off the rising trap lift before it serves your skull to the spiky roof.',
    'That final spike slides left to punish sloppy jumpers. You never learn.',
  ],
  30: [
    'Icy launchpad, shrinking stone, ghost block, cracked stone—you’re way outmatched.',
    'Adaptive traps and a bobbing saw are laughing at every panicked click.',
    'Two hidden crimson seams guard the fleeing finale door. Go ahead—choke now, loser.',
  ],
  31: [
    '31 levels deep and you still haven’t learned how to brake on ice. Tragic.',
    'Sliding face-first into a moving spike? That’s pure amateur hour, loser.',
    'There’s an icy perch right above that floor saw—try using your eyes.',
  ],
  32: [
    'Trusted a second red switch just because the first one was polite? Classic.',
    'The floor vanishes right under your toes and you STILL rush forward blind.',
    'Read the blinking rhythm instead of leaping into empty air, genius.',
  ],
  33: [
    'A giant saw is chewing your heels and you’re STILL hesitating? Run, idiot.',
    'Jump under that spiked roof and you deserve the instant haircut.',
    'Cracked stone, ghost ledge, ceiling corridor—zero room for slow thumbs.',
  ],
  34: [
    'The platform literally flickers red before vanishing and you STILL stood on it.',
    'Three blinking blocks and a blade—your sense of rhythm is nonexistent.',
    'Made it past the phase blocks just to panic on a shrinking ledge. Adorable.',
  ],
  35: [
    'Cracked stone and one bobbing blade already breaking your spirit? Cute.',
    'Stop freezing in front of the vertical saw—slip under when it climbs.',
    'Bounce pad, shrinking stone, ghost block—and you’re still folding.',
  ],
  36: [
    'Heavy gravity broke your jump, then light gravity broke your skull. Impressive.',
    'You hit the switch and kept holding jump like gravity stayed heavy. Tragic.',
    'Feather your thumb after the flip—ceiling spikes do not negotiate.',
  ],
  37: [
    'Low gravity plus ceiling spikes—stop holding jump like an absolute maniac.',
    'Feather-tap jump or keep donating your skull to the roof, loser.',
    'Three spiked roofs in one level and your heavy thumb hasn’t learned a thing.',
  ],
  38: [
    'Still climbing that suicidal spiked detour over a fake black wall? Gullible idiot.',
    'Not every solid-looking barrier actually exists—try walking forward for once.',
    'Walked through wall #1, then forgot everything at wall #2. Iconic stupidity.',
  ],
  39: [
    'Ice, blinking platforms, sneaky belt, and a switch—pick which one embarrassed you most.',
    'Your slide carried you straight past the beat of the phase block. Again.',
    'You hit the escape switch and forgot to look up. Predictable.',
  ],
  40: [
    'Level 40 and a single cracked stone still makes your palms sweat?',
    'Time the blade and shuttle cleanly—sloppy jumps won’t survive this chapter.',
    'Two crimson floor slits guarding the finish. Go ahead, choke like usual.',
  ],
  41: [
    'Heavy gravity kills weak jumps—leap from the absolute edge or keep feeding the pit.',
    'Lead boots plus shrinking stones? Your slow reflexes never stood a chance.',
    'That final spike slides left to humiliate early jumpers. Try noticing it.',
  ],
  42: [
    'Headwind steals your jump range and you STILL leap way too early. Hopeless.',
    'Now the tailwind wants to slam you into a crusher—hold left and brake, idiot.',
    'Gale-force gusts shifting mid-level, and your thumbs are still asleep.',
  ],
  43: [
    'Alternating phase blocks aren’t random—your jump timing just is.',
    'Flickering red means jump NOW, not stand there admiring the abyss.',
    'Cleared the skyway just to freeze on the shrinking stone. Pure comedy.',
  ],
  44: [
    'Controls flipped past that friendly sign and your brain completely short-circuited.',
    'See the red border? Left moves right—stop walking backward into saws, idiot.',
    'Baiting a falling block with reversed controls—honestly, just quit now.',
  ],
  45: [
    'Angled bounce pad flinging you into nowhere? Tap back in midair, loser.',
    'Stay on the rising elevator one second too long and become ceiling paint again.',
    'Two trap lifts racing toward spiked roofs—bail early or stay dead.',
  ],
  46: [
    'Two red switches and you STILL didn’t expect the second one to betray you?',
    'Wait for the blinking stones to lock in instead of diving into the void.',
    'You survived the switches just to get sloppy on the landing strip.',
  ],
  47: [
    'Waxed ice rink with a sliding spike—counter-tap left or keep skating into death.',
    'Use the icy perch over the floor blade instead of hugging spinning steel, idiot.',
    'Zero friction on the finale strip, and you’re still sprinting onto the red seam.',
  ],
  48: [
    'First spike ducks away harmlessly—stop jumping straight onto its lethal neighbor.',
    'Two sliding spikes and a crusher later, you still haven’t figured out timing.',
    'Panic-hopping in a decoy minefield? Pure comedy, loser.',
  ],
  49: [
    'Giant chaser saw at your back—pause for half a second and you’re shredded.',
    'Sprint flat under the ceiling teeth; one panic jump ends your whole run.',
    'Barely halfway to 100 and already crumbling to a single saw. Pathetic.',
  ],
  50: [
    '50% done and 100% broken—this boss stage is exposing every bad habit you have.',
    'Brake on the ice, catch the shuttle, and don’t trust anything that looks easy.',
    'Two crimson floor seams guard the fleeing door. Choke here and prove me right, loser.',
  ],
};
