/**
 * 100 unique, increasingly cruel level-completion taunts keyed by exact level ID (1..100).
 * Every stage mocks the player harder for stubbornly pushing further into Try harder, Loser!
 */
export const LEVEL_COMPLETE_TAUNTS: Record<number, string> = {
  // CHAPTER 1 (1-5): Smug Belittling
  1: 'Level 1 cleared. Do you also expect a parade when you tie your shoes?',
  2: 'You survived Level 2. Alert the press, a sentient potato cleared the tutorial.',
  3: 'Congrats on chasing a door like a confused golden retriever.',
  4: 'Four levels down and you still jump like you are guessing the controls.',
  5: 'Chapter 1 finished! Enjoy the only moment of joy this game will ever give you.',

  // CHAPTER 2 (6-10): Rising Sarcasm
  6: 'Level 6 done. Only 94 more chances to embarrass yourself.',
  7: 'Lucky bounce. Even gravity felt mildly bad for you there.',
  8: 'You beat Level 8? Relax, we haven’t even turned the cruelty up yet.',
  9: 'Nine levels in and your dignity is already looking shaky.',
  10: 'Level 10 cleared. Congrats — adaptive death-clustering traps just woke up.',

  // CHAPTER 3 (11-15): Condescending Mockery
  11: 'You actually made it to 11. Your stubbornness is outpacing your talent.',
  12: 'Cleared 12 by sheer panic. Ugly, messy, and somehow still alive.',
  13: 'Unlucky 13 couldn’t stop you? Don’t worry, 14 is already sharpening its blades.',
  14: 'Still here? Most losers quit before embarrassing themselves this badly.',
  15: '15% done and already sweating. You are NOT surviving the 50s.',

  // CHAPTER 4 (16-20): Biting Ego Jabs
  16: 'You crossed Level 16? Must have been a stray finger twitch.',
  17: 'That clear had zero grace and 100% blind panic.',
  18: 'Eighteen levels of falling for obvious traps and you still click Next.',
  19: 'Imagine struggling that hard just to reach Level 20. Couldn’t be me.',
  20: 'Level 20 cleared. Pop-up spikes now auto-rearm permanently. Good luck, loser.',

  // CHAPTER 5 (21-25): Sharper Cruelty
  21: 'You are officially old enough in this game to regret playing it.',
  22: 'Deja vu? No, you just make the exact same dumb mistakes in every room.',
  23: 'Twenty-three levels and your thumbs still haven’t learned timing.',
  24: 'Watching you scrape past 24 was painful for both of us.',
  25: 'Quarter of the way to 100. Your ego won’t survive the next quarter.',

  // CHAPTER 6 (26-30): Dismissive Contempt
  26: 'Level 26 cleared. You really think this makes you good, huh?',
  27: 'Pure fluke. If you replayed 27 right now you’d die ten times.',
  28: 'Your stickman is filing for emotional distress after carrying you through 28.',
  29: 'Barely crawled across 29. Honestly embarrassing to watch.',
  30: '30 down, 70 crueler nightmares left. The warm-up just officially ended.',

  // CHAPTER 7 (31-35): Brutal Roasting Begins
  31: 'Still playing at Level 31? Do you have no hobbies or just no shame?',
  32: 'The floor hated you on 32 and somehow you still tripped over the finish line.',
  33: 'Dodged three saws by pure accident. Don’t act like that was skill, loser.',
  34: 'Memorizing invisible blocks after dying to every single one isn’t genius.',
  35: 'You beat 35? Congrats, you unlocked even worse psychological damage.',

  // CHAPTER 8 (36-40): Zero Respect
  36: 'Level 36 cleared. Your thumbs are visibly crying for mercy.',
  37: 'You scraped your skull across every ceiling spike and still got lucky.',
  38: '38 levels of being gaslit by pixels and you STILL come back for more.',
  39: 'You baited a crusher after becoming a pancake first. Truly inspiring.',
  40: 'Level 40 finished. Only 60 more levels to prove you’re still just bad.',

  // CHAPTER 9 (41-45): Hostile Ridicule
  41: '41 down. Gravity took a coffee break or you’d still be stuck there.',
  42: 'Survived 0.27s crumbles by pure button-mashing terror.',
  43: 'You walked out of the Blender Hallway with zero style and minus ten aura.',
  44: 'Guessing invisible ledges like a blindfolded pigeon — somehow it worked.',
  45: 'Cleared “Try Harder, Loser!” and proved why we named the game after you.',

  // CHAPTER 10 (46-50): Halfway Humiliation
  46: 'Even the checkpoint ran away from you on 46. Take the hint.',
  47: '47 levels in and your posture is probably wrecked. Was it worth it?',
  48: 'Feathering jumps like your life depended on it — still looked pathetic.',
  49: 'Congrats on reaching 50. Halfway to getting obliterated by Level 100.',
  50: 'LEVEL 50 CLEARED. Halfway done, 100% broken, and the cruel half starts NOW.',

  // CHAPTER 11 (51-55): Cold & Mean
  51: 'Welcome to the second half. Everything before this was daycare, loser.',
  52: 'You dodged the pop-ups only after stepping on every single seam first.',
  53: 'Survived 53? Don’t smile — your downfall is already scheduled.',
  54: '54 levels deep and still acting shocked when the floor vanishes.',
  55: 'Sprinting through crushers doesn’t hide the sheer panic in your clicks.',

  // CHAPTER 12 (56-60): Gaslight Cruelty
  56: 'You STILL read the signs on Level 56? Incredible gullibility.',
  57: 'Five crumbling slabs cleared. Do you want a sticker for basic survival?',
  58: 'That buzzsaw missed you by two pixels. Pure, undeserved luck.',
  59: '59 down. At this point you are just fueled by spite and delusion.',
  60: 'Level 60 cleared! Certified Clown License officially laminated and framed.',

  // CHAPTER 13 (61-65): Psychological Warfare
  61: '61 levels wasted proving you can’t walk away from a browser game.',
  62: 'You survived the trap floor symphony. Now go ice your trembling fingers.',
  63: 'Level 63 done. Every stage from here is engineered to ruin your mood.',
  64: 'Dodging invisible guillotines won’t save you from the 90s, loser.',
  65: 'Even the exit filed a restraining order and you STILL chased it down.',

  // CHAPTER 14 (66-70): Ice-Cold Contempt
  66: 'Level 66 cleared. Statistically, you should have rage-quit 40 levels ago.',
  67: 'You jumped every red seam like a paranoid rabbit. Hilarious to watch.',
  68: 'Micro-ledges conquered by micro-brain sheer stubbornness.',
  69: 'Level 69 cleared. Zero jokes, zero applause, just keep suffering.',
  70: '70 levels down. Seventy shades of failure and you still think you’re HIM.',

  // CHAPTER 15 (71-75): Existential Roasting
  71: 'Seriously, close the tab. This level of stubbornness is concerning.',
  72: 'You rode the Crumble Express straight into worse trauma. Congrats.',
  73: 'Surviving four hyper-saws on 73 only delays your inevitable collapse.',
  74: '74 done. Your stickman hates you more with every single pixel.',
  75: '75% COMPLETE. Three-quarters of the way to realizing Level 100 is impossible.',

  // CHAPTER 16 (76-80): Merciless Endgame Buildup
  76: 'Quarter-second floors cleared. Your nervous system must be fried by now.',
  77: 'Lucky 77? No, just obsessive retrying until the universe gave up.',
  78: 'You squeezed through the spike tunnel with pure sweat and zero dignity.',
  79: 'Ghost Walk of Shame complete. Emphasis heavily on the shame.',
  80: 'Level 80 cleared. Eighty reasons you should’ve quit — zero lessons learned.',

  // CHAPTER 17 (81-85): Pure Malice
  81: 'You dragged yourself out of Mental Breakdown Lane? Barely.',
  82: 'Five paper bridges burned behind you. Just like your free time.',
  83: '83 cleared. The saws are taking notes for how to shred you on 99.',
  84: 'You finally remembered where the invisible blocks were after 20 funerals.',
  85: '85 down. Only 15 levels between you and total psychological annihilation.',

  // CHAPTER 18 (86-90): Delusion Check
  86: 'Delusion Level: Maximum. You genuinely believe you’re beating 100, huh?',
  87: 'Not a single safe pixel on 87 and you still crawled across the line.',
  88: 'Survived the Twin Crusher Waltz. Your fingers are probably numb.',
  89: '89 cleared! Welcome to the edge of the abyss, loser.',
  90: 'LEVEL 90 CONQUERED. The final 10 levels on Earth await. Turn back now.',

  // CHAPTER 19 (91-95): Ruthless Gatekeepers
  91: 'Gatekeeper #1 down. Your ego is writing checks 99 and 100 will bounce.',
  92: 'You survived 0.21s crumble hell?! Okay, you’re legitimately unhinged.',
  93: 'Gatekeeper #3 cleared. Hands shaking yet? Because it gets way worse.',
  94: 'Four gatekeepers dead. One left before Chapter 20 destroys your soul.',
  95: 'You actually breached Chapter 20. Leave your sanity at the door, loser.',

  // CHAPTER 20 (96-100): THE PEAK OF SUFFERING
  96: 'Level 96 cleared. Four stages from immortality — and 99% chance you fold.',
  97: 'Pixel-Perfect Purgatory beaten. Honestly horrifying that you’re still here.',
  98: '98 DONE. Level 99 is next — where almost every “legend” chokes forever.',
  99: 'You actually survived The Ultimate Test?! Fine. Open Level 100. Zero checkpoints, zero hints, and the exit itself will not sit still.',
  100: 'I told you if you won this I would have nothing left to insult. I am officially speechless. You conquered all 100 levels with zero checkpoints on the last stage.',
};

export function getLevelCompleteTaunt(levelId: number): string {
  return (
    LEVEL_COMPLETE_TAUNTS[levelId] ??
    `Level ${levelId} cleared. Don’t get proud — the next one is crueler.`
  );
}

export function getPerformanceJab(levelId: number, levelDeaths: number): string | null {
  if (levelId >= 100) {
    return levelDeaths === 0
      ? 'Zero deaths on Level 100?! That is beyond human.'
      : `${levelDeaths} deaths to conquer the literally impossible. Worth every single one.`;
  }
  if (levelDeaths === 0) {
    return levelId >= 60
      ? 'Zero deaths here?! Suspicious. Are you a robot?'
      : 'Zero deaths? Pure fluke. Next stage will fix that.';
  }
  if (levelDeaths >= 25) {
    return `${levelDeaths} deaths on ONE level. That isn’t skill, that’s pure Stockholm syndrome.`;
  }
  if (levelDeaths >= 10) {
    return `${levelDeaths} deaths just to scrape past this room. Try harder, Loser!`;
  }
  return null;
}
