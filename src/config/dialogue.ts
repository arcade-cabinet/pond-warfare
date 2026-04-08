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

import {
  COMPAT_SABOTEUR_CHASSIS_KIND,
  COMPAT_SAPPER_CHASSIS_KIND,
  LOOKOUT_KIND,
  MEDIC_KIND,
  MUDPAW_KIND,
} from '@/game/live-unit-kinds';
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

  [MUDPAW_KIND]: pool({
    select: ['Mudpaw ready.', 'What needs doing?', 'Point me at the problem.', 'Ready for fieldwork.'],
    select_repeat: ['Still on it.', 'I heard you.', 'Busy paws, steady pond.'],
    select_spam: ["I'm doing five jobs already!", 'One more tap and you can do it yourself.', 'Alright, alright, I am moving.'],
    move: ['On it.', 'Going!', 'Right away.', 'Off I go.'],
    gather: ['Fish first, questions later.', 'Timber!', 'Got a haul coming in.', 'I can carry that.'],
    build: ['Setting the frame.', 'Brick by brick.', 'I can patch this together.', 'Give me a moment.'],
    idle: ['*whistles*', 'The pond is too quiet.', 'I could be fixing something.', 'Waiting on your signal.'],
    combat: ['I can handle it!', 'Not backing down!', 'For the Lodge!'],
    kill: ['Still got it.', 'One less problem.', 'That worked better than expected.'],
    low_hp: ['Ow ow ow!', 'Not the face!', 'I need help here!'],
    death: ['Tell them I held the line...'],
  }),

  [MEDIC_KIND]: pool({
    select: ['How can I help?', 'Healing ready.', "Who's hurt?", "I'm here."],
    select_repeat: ["I'm a medic, not a miracle worker.", 'Yes, still healing.'],
    select_spam: ['Heal yourself!', 'I charge extra for this.', 'My bedside manner has limits.'],
    move: ['On my way to help.', 'Coming!', 'Hold on!'],
    heal: ['This might sting.', "You'll be fine.", 'Hold still.', 'Good as new!'],
    idle: ['Everyone healthy? Good.', '*organizes herbs*', 'An otter a day keeps the gator away.'],
    combat: ["I'm a medic!", 'Protect me!', 'Behind you!'],
    low_hp: ['Physician, heal thyself...', 'I need healing too!'],
    death: ["I couldn't... save myself..."],
  }),

  [LOOKOUT_KIND]: pool({
    select: ['Eyes up.', 'Watching the marsh.', 'Recon ready.'],
    select_repeat: ['Still watching.', 'I have the perimeter.', 'Nothing slips past me twice.'],
    select_spam: ['The marsh is not getting clearer by tapping me.', 'I can run recon and complain at the same time.', 'Yes, yes, still on watch.'],
    move: ['Sweeping ahead.', 'I have the edge.', 'Taking point.'],
    discover: ['Movement ahead!', 'Found an opening!', 'Enemy position marked!', 'New ground sighted!'],
    idle: ['*scans horizon*', 'Fog is shifting...', 'Keeping watch.'],
    death: ['Eyes... closing...'],
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

  [EntityKind.Shaman]: pool({
    select: ['Spirits listen.', 'Healing current ready.', 'Who needs mending?'],
    select_repeat: ['Calm yourself.', 'The marsh still answers.', 'I am already watching them.'],
    select_spam: ['The spirits are patient. Be like them.', 'Even magic needs breathing room.', 'Tap softer.'],
    move: ['Carrying the current.', 'I am there.', 'Healing on the move.'],
    heal: ['Easy now.', 'Let the current mend you.', 'Back to your feet.', 'The marsh restores.'],
    idle: ['*chants softly*', 'The water remembers.', 'Wounds are never far for long.'],
    combat: ['Stay inside the circle!', 'I can keep you standing!', 'Do not fall yet!'],
    low_hp: ['I need cover!', 'The spirits fade...', 'Too much pressure!'],
    death: ['The current... takes me...'],
  }),

  [EntityKind.Sapper]: pool({
    select: ['Charges set.', 'Siege ready.', 'Point me at the hard target.'],
    select_repeat: ['I know where the weak point is.', 'Still carrying enough powder.', 'Waiting on the breach.'],
    select_spam: ['If it explodes early, that is on you.', 'You want a hole or not?', 'I work better with fewer interruptions.'],
    move: ['Moving charges.', 'Closing on the wall.', 'I have the breach.'],
    attack: ['Breach it!', 'Fire in the reeds!', 'Bring it down!', 'Open the way!'],
    idle: ['*checks fuse*', '*packs powder*', 'Stone always cracks eventually.'],
    combat: ['Hold them off!', 'Need one clean opening!', 'Almost there!'],
    kill: ['Target broken.', 'That opened nicely.', 'Nothing stands forever.'],
    low_hp: ['Need cover for the breach!', 'Fuse is shorter than I am!', 'Too hot up here!'],
    death: ['Light the next one...'],
  }),

  [EntityKind.Saboteur]: pool({
    select: ['Quiet feet.', 'No alarms yet.', 'I go where they do not look.'],
    select_repeat: ['Still unseen.', 'Patience makes the opening.', 'I know the route.'],
    select_spam: ['You are louder than I am.', 'Stealth works better without commentary.', 'Yes, yes, I am sneaking.'],
    move: ['Slipping around.', 'Taking the side path.', 'Keeping low.'],
    attack: ['Cut the line.', 'Their rear is open.', 'Strike and vanish!', 'Now they notice me.'],
    idle: ['*checks blade*', '*melts into the reeds*', 'Waiting for the mistake.'],
    combat: ['Hit the weak point!', 'They never saw me!', 'In and out!'],
    kill: ['Clean work.', 'Gone before they felt it.', 'That lane is open now.'],
    low_hp: ['Too exposed!', 'Need another shadow!', 'Time to disappear!'],
    death: ['Should have... stayed hidden...'],
  }),
};

function canonicalDialogueKind(kind: EntityKind): EntityKind {
  if (kind === COMPAT_SAPPER_CHASSIS_KIND) return EntityKind.Sapper;
  if (kind === COMPAT_SABOTEUR_CHASSIS_KIND) return EntityKind.Saboteur;
  return kind;
}

/** Pick a random line from a dialogue pool. Returns null if pool is empty. */
export function pickDialogue(kind: EntityKind, trigger: DialogueTrigger): string | null {
  const unitPool = UNIT_DIALOGUE[canonicalDialogueKind(kind)];
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
