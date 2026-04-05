/**
 * Unit Dialogue System
 *
 * Warcraft-style unit barks: click responses, combat callouts, idle chatter,
 * discovery announcements, and annoyance escalation.
 *
 * Each unit type has pools of lines for different triggers.
 * Lines are picked randomly from the pool. Clicking the same unit
 * repeatedly escalates through tiers (normal → annoyed → exasperated).
 */

import { EntityKind } from '@/types';

export type DialogueTrigger =
  | 'select' // Clicked/selected
  | 'select_repeat' // Clicked again (annoyed tier 1)
  | 'select_spam' // Clicked too many times (exasperated tier 2)
  | 'move' // Given move order
  | 'attack' // Given attack order
  | 'gather' // Assigned to gather
  | 'build' // Assigned to build
  | 'idle' // Been idle too long (>30 seconds)
  | 'combat' // Entered combat
  | 'kill' // Killed an enemy
  | 'low_hp' // Health below 30%
  | 'heal' // Being healed
  | 'rank_up' // Veterancy promotion
  | 'discover' // Found enemy nest or new area
  | 'death'; // Unit dying

/** Dialogue pool: array of possible lines for a trigger */
export type DialoguePool = Record<DialogueTrigger, string[]>;

/** Default empty pool (for unit types without custom dialogue) */
const EMPTY_POOL: DialoguePool = {
  select: [],
  select_repeat: [],
  select_spam: [],
  move: [],
  attack: [],
  gather: [],
  build: [],
  idle: [],
  combat: [],
  kill: [],
  low_hp: [],
  heal: [],
  rank_up: [],
  discover: [],
  death: [],
};

function pool(overrides: Partial<DialoguePool>): DialoguePool {
  return { ...EMPTY_POOL, ...overrides };
}

export const UNIT_DIALOGUE: Partial<Record<EntityKind, DialoguePool>> = {
  [EntityKind.Commander]: pool({
    select: ['Ready to lead.', 'Awaiting orders.', 'For the pond!', 'What is thy bidding?'],
    select_repeat: ['I heard you the first time.', "Yes, yes, I'm here.", 'Still listening...'],
    select_spam: [
      'Do you MIND?',
      'I have a war to run!',
      'Stop poking me!',
      "That's it, I'm filing a complaint.",
    ],
    move: ['Moving out.', 'On my way.', 'As you command.', 'Forward!'],
    attack: ['For the otters!', 'Charge!', 'Into battle!', "They'll rue this day!"],
    idle: ['The pond grows restless...', 'We should act soon.', 'I sense danger in the water.'],
    combat: ['Hold the line!', 'Stand firm!', 'Fight for our home!'],
    kill: ['One less predator.', 'The pond is safer.', 'Victory!'],
    low_hp: ['I need backup!', 'Falling back!', 'Medic!'],
    rank_up: ['Experience is the best teacher.', 'Stronger every day.'],
    discover: ['Enemy base spotted!', "We've found them!", 'There they are...'],
    death: ['Tell them... I fought well...', 'The pond... endures...'],
  }),

  [EntityKind.Gatherer]: pool({
    select: ['Ready to work!', 'What do you need?', "Job's a job.", 'Hmm?'],
    select_repeat: ['More work?', 'Alright, alright.', 'I was on break!'],
    select_spam: ["I'm not a machine!", 'Union rules say I get a break!', 'STOP. CLICKING. ME.'],
    move: ['On it.', 'Going!', 'Right away.', 'Off I go.'],
    gather: ['Ooh, shiny fish!', 'Timber!', "These logs won't gather themselves.", 'Heavy load...'],
    build: ['Hammer time!', 'Building away!', 'Brick by brick.', "This'll look great."],
    idle: ['*whistles*', '*yawns*', 'Sooo... what now?', 'I could be gathering, just saying.'],
    combat: ["I'm a worker, not a fighter!", 'Aaah!', 'Why me?!'],
    kill: ['Did... did I do that?', "Beginner's luck!"],
    low_hp: ['Ow ow ow!', 'Not the face!', 'I need help here!'],
    death: ['Tell my family... I gathered well...'],
  }),

  [EntityKind.Brawler]: pool({
    select: ['Ready for a scrap.', 'Who needs hitting?', "Let's go.", 'Bring it.'],
    select_repeat: ["I said I'm ready!", 'Point me at something.', 'Getting antsy here.'],
    select_spam: ['Wanna fight about it?', "I'll fight anyone. Even you.", 'My fists are bored.'],
    move: ['Moving.', 'Heading out.', 'Right behind you.'],
    attack: ['Finally!', "Smash 'em!", 'RAAARGH!', 'You picked the wrong pond!'],
    idle: ['*shadow boxes*', '*cracks knuckles*', 'Someone, anyone, fight me.'],
    combat: ['Come get some!', 'Is that all you got?', 'Eat claw!'],
    kill: ['Down you go!', 'Next!', 'Too easy.', "Who's next?"],
    low_hp: ['Just a scratch!', 'I can take it!', 'Need a breather...'],
    rank_up: ['Tougher than ever!', 'POWER UP!'],
    death: ['Worth... every... punch...'],
  }),

  [EntityKind.Sniper]: pool({
    select: ['Locked and loaded.', 'Eyes on target.', 'Awaiting coordinates.', 'Steady...'],
    select_repeat: ['I see everything from up here.', 'Patience is a virtue.'],
    select_spam: ["You're in my shot!", 'Do you want to get sniped?', 'I have VERY good aim.'],
    move: ['Relocating.', 'New position.', 'Shifting.'],
    attack: ['Taking the shot.', 'Target acquired.', 'Firing!', 'Bullseye.'],
    idle: ['*adjusts scope*', 'Scanning...', 'Nothing moves without me knowing.'],
    combat: ['Stay in range...', "Don't let them close!"],
    kill: ['Clean hit.', 'Splash.', 'Target eliminated.'],
    low_hp: ['Too close!', 'Need distance!', 'Back off!'],
    death: ["Didn't... see that coming..."],
  }),

  [EntityKind.Healer]: pool({
    select: ['How can I help?', 'Healing ready.', "Who's hurt?", "I'm here."],
    select_repeat: ["I'm a healer, not a miracle worker.", 'Yes, still healing.'],
    select_spam: ['Heal yourself!', 'I charge extra for this.', 'My bedside manner has limits.'],
    move: ['On my way to help.', 'Coming!', 'Hold on!'],
    heal: ['This might sting.', "You'll be fine.", 'Hold still.', 'Good as new!'],
    idle: ['Everyone healthy? Good.', '*organizes herbs*', 'An otter a day keeps the gator away.'],
    combat: ["I'm a healer!", 'Protect me!', 'Behind you!'],
    low_hp: ['Physician, heal thyself...', 'I need healing too!'],
    death: ["I couldn't... save myself..."],
  }),

  [EntityKind.Scout]: pool({
    select: ["What's out there?", 'Reporting in.', 'Fast and quiet.'],
    select_repeat: ["I'm built for speed, not conversation.", 'Zoom zoom.'],
    select_spam: ["Can't catch me!", 'Nyoom!', "You'll never be as fast as me."],
    move: ['Gone!', 'Like the wind!', 'Scouting ahead!'],
    discover: ['Found something!', 'Enemy spotted!', 'You need to see this!', 'Nest located!'],
    idle: ['*stretches*', 'Getting rusty...', 'Let me run!'],
    death: ['Too... slow...'],
  }),

  [EntityKind.Shieldbearer]: pool({
    select: ['Shield wall!', 'Nothing gets past me.', 'Standing firm.'],
    select_repeat: ['I AM the wall.', 'Try to move me.'],
    select_spam: ['You wanna arm-wrestle?', "This shield isn't for decoration."],
    move: ['Advancing.', 'Shield up, moving out.'],
    attack: ['SHIELD BASH!', 'Take this!'],
    combat: ["They can't break through!", 'HOLD!', 'Block everything!'],
    low_hp: ["Shield's cracking!", 'Need repairs!'],
    death: ['The shield... holds...'],
  }),

  [EntityKind.Catapult]: pool({
    select: ['Ready to launch.', 'Siege weapon standing by.', 'Pick a target.'],
    select_repeat: ['These things take time to aim.', 'Patience. Big rocks, big damage.'],
    select_spam: ['Want me to aim at YOU?', 'I could launch you too.'],
    move: ['Hauling into position...', 'Slowly but surely.', 'Heavy payload moving.'],
    attack: ['FIRE!', 'INCOMING!', 'Watch your heads!', 'LAUNCH!'],
    kill: ['Direct hit!', 'BOOM!', 'Flattened.'],
    idle: ['*polishes boulder*', 'Just waiting for a target...'],
    death: ['*creak* *SNAP*'],
  }),

  [EntityKind.Swimmer]: pool({
    select: ['Making waves!', "Water's fine!", 'Dive ready.'],
    select_repeat: ["I'm part fish, you know.", 'Splish splash!'],
    select_spam: ['Stop making me surface!', 'I LIVE in the water.'],
    move: ['Swimming!', 'Gliding through!', "Current's good!"],
    attack: ['Surprise attack!', 'From the depths!'],
    idle: ['*blows bubbles*', '*floats*', 'La la la...'],
    death: ['*glub glub*'],
  }),

  [EntityKind.Trapper]: pool({
    select: ["Trap's set.", 'Careful where you step.', 'Sneaky sneaky.'],
    select_repeat: ['Watch out for my traps!', 'I lay more than eggs.'],
    select_spam: ["Don't trigger my traps!", 'I trapped a pun, want to hear it?'],
    move: ['Creeping forward.', 'Setting up position.'],
    attack: ['GOTCHA!', 'Snared!', "You're stuck now!"],
    kill: ['The trap worked!', 'Caught!'],
    idle: ['*whittles trap*', '*checks snares*'],
    death: ['Trapped... myself...'],
  }),
};

/** Pick a random line from a dialogue pool. Returns null if pool is empty. */
export function pickDialogue(kind: EntityKind, trigger: DialogueTrigger): string | null {
  const unitPool = UNIT_DIALOGUE[kind];
  if (!unitPool) return null;
  const lines = unitPool[trigger];
  if (!lines || lines.length === 0) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}

/**
 * Get the appropriate select trigger based on click count.
 * Returns 'select' for first click, 'select_repeat' for 2-4, 'select_spam' for 5+.
 */
export function selectTriggerForClickCount(count: number): DialogueTrigger {
  if (count >= 5) return 'select_spam';
  if (count >= 2) return 'select_repeat';
  return 'select';
}
