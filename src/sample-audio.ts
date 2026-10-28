import { phaseAt, phaseMilliseconds, validRhythm, type Rhythm } from "./engine.ts";
import { phaseRoles, type SoundSet } from "./audio-types.ts";

// Fixed -12.04 dB mix headroom. Set once, independently of the user's volume
// and mute controls; starting another cue never changes this gain. The measured
// 3.006 peak of an extreme short-hold mix becomes 0.752 at full master volume.
export const SAMPLE_MIX_HEADROOM = 0.25;

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  buffer: AudioBuffer;
  key: string | null;
  start: number;
  offset: number;
  end: number;
}
interface PausedVoice { buffer: AudioBuffer; key: string; offset: number }
interface Timeline {
  set: SoundSet;
  rhythm: Rhythm;
  end: number;
  wallOrigin: number;
  audioOrigin: number;
  cursor: number;
}

/** Recorded phase cues: one independent source per event, with the sample's own
 * attack and decay. Phase boundaries never automate or stop another voice.
 * The retained synthesis engine in audio.ts is deliberately not used here. */
export class SampleAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private muteGate?: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<void>>();
  private voices = new Set<Voice>();
  private paused: PausedVoice[] = [];
  private seen = new Set<string>();
  private timeline?: Timeline;
  private timer?: ReturnType<typeof setInterval>;
  private volume = 0.35;
  private muted = false;
  private releaseUntil = 0;
  private loadState: "recorded" | "partial" | "unavailable" = "unavailable";
  get recordingStatus() { return this.loadState; }

  private ensureContext() {
    this.context ??= new AudioContext();
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.muteGate = this.context.createGain();
      this.muteGate.gain.value = this.muted ? 0 : 1;
      const headroom = this.context.createGain();
      headroom.gain.value = SAMPLE_MIX_HEADROOM;
      this.master.connect(headroom);
      headroom.connect(this.muteGate);
      this.muteGate.connect(this.context.destination);
    }
    return this.context;
  }
  async unlock() {
    try { await this.ensureContext().resume(); }
    catch { /* Unsupported/blocked audio must not interrupt the breathing clock. */ }
  }
  async warmup(set: SoundSet) { await this.prepare(set); }
  async prepare(set: SoundSet) {
    let context: AudioContext;
    try { context = this.ensureContext(); }
    catch { this.loadState = "unavailable"; return; }
    await Promise.all([...new Set(Object.values(set.recordings).filter((url): url is string => Boolean(url)))].map(url => {
      if (this.buffers.has(url)) return;
      let pending = this.loading.get(url);
      if (!pending) {
        pending = (async () => {
          try {
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error("Recording unavailable");
            this.buffers.set(url, await context.decodeAudioData(await response.arrayBuffer()));
          } catch { /* Keep available samples; never substitute synthesized notes. */ }
        })().finally(() => this.loading.delete(url));
        this.loading.set(url, pending);
      }
      return pending;
    }));
    const loaded = phaseRoles.filter(role => {
      const url = set.recordings[role];
      return url && this.buffers.has(url);
    }).length;
    this.loadState = loaded === 4 ? "recorded" : loaded ? "partial" : "unavailable";
  }
  setVolume(value: number) {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.35;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.05);
  }
  setMuted(muted: boolean) {
    if (this.muted === muted) return;
    this.muted = muted;
    const c = this.context;
    if (c && this.muteGate) {
      const gain = this.muteGate.gain;
      const held = gain.value;
      gain.cancelScheduledValues(c.currentTime);
      gain.setValueAtTime(held, c.currentTime);
      gain.linearRampToValueAtTime(muted ? 0 : 1, c.currentTime + 0.01);
    }
    if (muted) {
      // Discard already-triggered tails. Unmute never resumes/replays them.
      this.paused = [];
      for (const voice of this.voices) {
        if (voice.key && c && voice.start > c.currentTime) this.seen.delete(voice.key);
        this.release(voice);
      }
      if (this.timeline) this.timeline.cursor = this.elapsed();
    }
    this.pump();
  }
  private elapsed() {
    return this.timeline ? Math.max(0, performance.now() - this.timeline.wallOrigin) : 0;
  }
  private play(buffer: AudioBuffer, key: string | null, requestedAt: number, offset = 0, resuming = false) {
    const c = this.context;
    if (!c || !this.master || c.state !== "running" || this.muted || offset >= buffer.duration) return;
    const gain = c.createGain();
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    source.connect(gain); gain.connect(this.master);
    // One rendering quantum of lead avoids accidentally scheduling in the past.
    const at = Math.max(requestedAt, c.currentTime + ("baseLatency" in c ? 128 / c.sampleRate : 0), this.releaseUntil);
    gain.gain.value = resuming ? 0 : 1;
    if (resuming) {
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(1, at + Math.min(0.004, buffer.duration - offset));
    }
    const voice: Voice = { source, gain, buffer, key, start: at, offset, end: at + buffer.duration - offset };
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect(); gain.disconnect(); this.voices.delete(voice);
    };
    // Play the entire recording, including its quiet tail: all assigned MP3s
    // decode to eight seconds. Nothing here depends on the phase duration.
    source.start(at, offset); // No loop, stretch, phase gate or scheduled stop.
  }
  private release(voice: Voice) {
    const c = this.context;
    if (!c) return;
    const now = c.currentTime;
    const end = voice.start > now ? now : Math.max(now, Math.min(voice.end, now + 0.02));
    const held = voice.gain.gain.value;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(held, now);
    voice.gain.gain.linearRampToValueAtTime(0, end);
    this.releaseUntil = Math.max(this.releaseUntil, end);
    try { voice.source.stop(end); } catch { /* Already ended. */ }
    this.voices.delete(voice);
  }
  private cancelTimer() {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }
  private pump = () => {
    const timeline = this.timeline, c = this.context;
    if (!timeline || !c) return;
    const now = this.elapsed();
    if (now >= timeline.end) { this.finish(); return; }
    // Never replay a backlog after a main-thread stall. Muted events are marked
    // only at their boundary, so unmuting before a future phase can still cue it.
    timeline.cursor = Math.max(timeline.cursor, now);
    const suppressed = this.muted || c.state !== "running";
    const horizon = suppressed ? now : now + 250;
    let queued = 0;
    while (timeline.cursor < timeline.end && timeline.cursor <= horizon && queued++ < 64) {
      const phase = phaseAt(timeline.cursor, timeline.rhythm);
      const boundary = Math.round(timeline.cursor + phase.remaining * 1000);
      const start = boundary - phaseMilliseconds(timeline.rhythm[phase.index]);
      if (suppressed && start > now) break;
      if (!this.seen.has(phase.key)) {
        this.seen.add(phase.key);
        const url = timeline.set.recordings[phaseRoles[phase.index]];
        const buffer = url ? this.buffers.get(url) : undefined;
        if (buffer && start >= now - 250)
          this.play(buffer, phase.key, timeline.audioOrigin + start / 1000);
      }
      timeline.cursor = boundary;
    }
  };
  run(set: SoundSet, rhythm: Rhythm, elapsedMs: number, endMs: number) {
    // Harmless repeated calls (including React renders) do not reset the ledger.
    if (this.timeline || !this.context || this.context.state !== "running" || !validRhythm(rhythm) || elapsedMs >= endMs) return;
    for (const voice of this.voices) if (voice.key === null) this.release(voice);
    this.timeline = {
      set, rhythm: [...rhythm], end: endMs, cursor: elapsedMs,
      wallOrigin: performance.now() - elapsedMs,
      audioOrigin: this.context.currentTime - elapsedMs / 1000,
    };
    if (!this.muted) for (const voice of this.paused)
      this.play(voice.buffer, voice.key, this.context.currentTime, voice.offset, true);
    this.paused = [];
    this.timer = setInterval(this.pump, 25);
    this.pump();
  }
  pause() {
    if (!this.timeline) return;
    this.cancelTimer(); this.timeline = undefined;
    const c = this.context;
    if (!c) return;
    // Idempotent: a React status effect must not erase the saved paused voices.
    if (this.voices.size === 0) return;
    this.paused = [];
    for (const voice of this.voices) {
      if (voice.key) {
        if (voice.start > c.currentTime) this.seen.delete(voice.key);
        else if (!this.muted && voice.end > c.currentTime)
          this.paused.push({ buffer: voice.buffer, key: voice.key, offset: voice.offset + c.currentTime - voice.start });
      }
      this.release(voice);
    }
  }
  finish() {
    this.cancelTimer(); this.timeline = undefined; this.paused = [];
    // Normal completion leaves already-started samples to finish their decay.
    for (const voice of this.voices)
      if (this.context && voice.start > this.context.currentTime) this.release(voice);
  }
  stop() {
    this.cancelTimer(); this.timeline = undefined; this.paused = []; this.seen.clear();
    for (const voice of this.voices) this.release(voice);
  }
  preview(set: SoundSet) {
    for (const voice of this.voices) if (voice.key === null) this.release(voice);
    const url = set.recordings.inhale, buffer = url ? this.buffers.get(url) : undefined;
    if (buffer) this.play(buffer, null, this.context?.currentTime ?? 0);
  }
}
