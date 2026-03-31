import * as Tone from 'tone';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '@/audio/audio-system';

describe('AudioSystem – richer music layers', () => {
  let sys: AudioSystem;

  beforeEach(async () => {
    vi.clearAllMocks();
    sys = new AudioSystem();
    await sys.init();
  });

  it('startMusic() creates melodic, harmonic, and percussion layers', () => {
    const transport = Tone.getTransport();

    sys.startMusic(true);

    const musicMgr = (sys as any).musicMgr;
    expect(musicMgr.musicSynth).toBeTruthy();
    expect(musicMgr.bassSynth).toBeTruthy();
    expect(musicMgr.padSynth).toBeTruthy();
    expect(musicMgr.kickSynth).toBeTruthy();
    expect(musicMgr.hatSynth).toBeTruthy();
    expect(musicMgr.melodySeq).toBeTruthy();
    expect(musicMgr.bassSeq).toBeTruthy();
    expect(musicMgr.padSeq).toBeTruthy();
    expect(musicMgr.kickSeq).toBeTruthy();
    expect(musicMgr.hatSeq).toBeTruthy();
    expect(transport.start).toHaveBeenCalledOnce();
  });

  it('startMusic() schedules the hat synth with a fixed pitch and duration', () => {
    sys.startMusic(false);

    const musicMgr = (sys as any).musicMgr;
    const sequenceCalls = (Tone.Sequence as any).mock.calls;
    const hatSequenceCallback = sequenceCalls[sequenceCalls.length - 1][0];
    hatSequenceCallback('now', true);

    expect(musicMgr.hatSynth.triggerAttackRelease).toHaveBeenCalledWith('C6', '16n', 'now');
  });

  it('toggleMute() ramps every music layer down and back up', () => {
    sys.startMusic(false);
    const musicMgr = (sys as any).musicMgr;

    sys.toggleMute();
    expect(musicMgr.musicGain.gain.rampTo).toHaveBeenLastCalledWith(0, 0.1);
    expect(musicMgr.bassGain.gain.rampTo).toHaveBeenLastCalledWith(0, 0.1);
    expect(musicMgr.padGain.gain.rampTo).toHaveBeenLastCalledWith(0, 0.1);
    expect(musicMgr.percussionGain.gain.rampTo).toHaveBeenLastCalledWith(0, 0.1);

    sys.toggleMute();
    expect(musicMgr.musicGain.gain.rampTo.mock.lastCall[0]).toBeCloseTo(0.064);
    expect(musicMgr.bassGain.gain.rampTo.mock.lastCall[0]).toBeCloseTo(0.04);
    expect(musicMgr.padGain.gain.rampTo.mock.lastCall[0]).toBeCloseTo(0.032);
    expect(musicMgr.percussionGain.gain.rampTo.mock.lastCall[0]).toBeCloseTo(0.036);
  });
});

describe('AudioSystem – expanded ambient soundscape', () => {
  it('startAmbient() creates layered ambient beds', async () => {
    const sys = new AudioSystem();
    await sys.init();

    sys.startAmbient();

    const ambientMgr = (sys as any).ambientMgr;
    expect(ambientMgr.ambientNoise).toBeTruthy();
    expect(ambientMgr.shimmerNoise).toBeTruthy();
    expect(ambientMgr.shimmerGain).toBeTruthy();
  });

  it('night ambience schedules frogs and ripples in addition to crickets', async () => {
    vi.useFakeTimers();
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9)
      .mockReturnValue(0.9);

    const sys = new AudioSystem();
    try {
      await sys.init();
      const ambientMgr = (sys as any).ambientMgr;
      ambientMgr.ambientFilter = { frequency: { rampTo: vi.fn() }, dispose: vi.fn() };
      ambientMgr.playCricketChirp = vi.fn();
      ambientMgr.playFrogCroak = vi.fn();
      ambientMgr.playPondBubble = vi.fn();
      ambientMgr.playWaterRipple = vi.fn();

      sys.updateAmbient(0.9);
      await vi.advanceTimersByTimeAsync(2500);

      expect(ambientMgr.playCricketChirp).toHaveBeenCalledOnce();
      expect(ambientMgr.playFrogCroak).toHaveBeenCalledOnce();
      expect(ambientMgr.playPondBubble).toHaveBeenCalledOnce();
      expect(ambientMgr.playWaterRipple).toHaveBeenCalledOnce();

      ambientMgr.shutdown();
    } finally {
      randomSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
