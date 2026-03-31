import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '@/audio/audio-system';
import { EntityKind } from '@/types';
import { mapScenario } from '@/ui/store';

describe('AudioSystem – combat and outcome cues', () => {
  let sys: AudioSystem;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sys = new AudioSystem();
    await sys.init();
  });

  it('throttles combat stingers so repeated triggers do not spam', async () => {
    const playAt = vi.spyOn((sys as any).sfxMgr, 'playAt');

    sys.combatStinger();
    sys.combatStinger();
    await vi.runAllTimersAsync();

    expect(playAt).toHaveBeenCalledTimes(3);
  });

  it('plays different victory and defeat motifs', async () => {
    const playAt = vi.spyOn((sys as any).sfxMgr, 'playAt');

    sys.victoryMotif();
    await vi.runAllTimersAsync();
    const victoryCalls = playAt.mock.calls.map((call) => call[0]);

    playAt.mockClear();
    sys.defeatMotif();
    await vi.runAllTimersAsync();
    const defeatCalls = playAt.mock.calls.map((call) => call[0]);

    expect(victoryCalls).toEqual([420, 560, 760]);
    expect(defeatCalls).toEqual([340, 240, 160]);
  });
});

describe('AudioSystem – biome and faction palettes', () => {
  let sys: AudioSystem;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sys = new AudioSystem();
    await sys.init();
  });

  it('uses the active biome to choose ambience accents', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const ambientMgr = (sys as any).ambientMgr;
    const accentPlayer = ambientMgr.accentPlayer;
    ambientMgr.ambientFilter = { frequency: { rampTo: vi.fn() }, dispose: vi.fn() };
    ambientMgr.playPondBubble = vi.fn();
    accentPlayer.playCurrentRush = vi.fn();

    mapScenario.value = 'river';
    sys.updateAmbient(0.2);
    await vi.advanceTimersByTimeAsync(2200);

    expect(accentPlayer.playCurrentRush).toHaveBeenCalledOnce();
    expect(ambientMgr.playPondBubble).toHaveBeenCalledOnce();

    ambientMgr.shutdown();
    randomSpy.mockRestore();
    mapScenario.value = 'standard';
  });

  it('plays different selection voice palettes for otters and predators', async () => {
    const playAt = vi.spyOn((sys as any).sfxMgr, 'playAt');

    sys.playSelectionVoice(EntityKind.Brawler, 'otter');
    await vi.runAllTimersAsync();
    const otterCalls = playAt.mock.calls.map((call) => [call[0], call[1]]);

    playAt.mockClear();
    sys.playSelectionVoice(EntityKind.Gator, 'predator');
    await vi.runAllTimersAsync();
    const predatorCalls = playAt.mock.calls.map((call) => [call[0], call[1]]);

    expect(otterCalls).toEqual([
      [640, 'sine'],
      [860, 'triangle'],
    ]);
    expect(predatorCalls).toEqual([
      [300, 'sawtooth'],
      [220, 'square'],
    ]);
  });
});
