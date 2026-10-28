import { PREPARATION_MS } from "./preparation";
import { useEffect, useRef, useState } from "react";
import { phaseAt, finishAt, type Rhythm } from "./engine";
import { validConfiguredRhythm } from "./duration-controls";
import { SampleAudio } from "./sample-audio";
import { soundSets } from "./media";
import type { Settings } from "./settings";
import type { TranslationKey } from "./i18n";
export type SessionStatus = "idle" | "running" | "paused" | "completed";
export function useBreathingSession(settings: Settings) {
  const [status, setStatus] = useState<SessionStatus>("idle"),
    [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false),
    [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false);
  const [audioStatus, setAudioStatus] =
    useState<TranslationKey>("audioInitial");
  const [preloading, setPreloading] = useState(false);
  const [inPreparation, setInPreparation] = useState(false),
    [preparationElapsed, setPreparationElapsed] = useState(0);
  const [configuration, setConfiguration] = useState<{
    rhythm: Rhythm;
    end: number;
  } | null>(null);
  const rhythm = configuration?.rhythm ?? settings.rhythm;
  const preparation = useRef(false);
  const audio = useRef(new SampleAudio()),
    operation = useRef(0),
    base = useRef(0),
    origin = useRef(0);
  const current = useRef({ status, settings });
  current.current = { status, settings };
  const timingValid =
    validConfiguredRhythm(settings.rhythm) &&
    Number.isFinite(settings.minutes) &&
    settings.minutes >= 1 &&
    settings.minutes <= 120;
  const end =
    configuration?.end ??
    (timingValid ? finishAt(settings.minutes, settings.rhythm) : 0);
  const endRef = useRef(end);
  endRef.current = end;
  function transition(next: SessionStatus) {
    current.current.status = next;
    setStatus(next);
  }
  const stageElapsed = () =>
    base.current +
    (current.current.status === "running"
      ? performance.now() - origin.current
      : 0);
  const currentElapsed = () =>
    preparation.current
      ? 0
      : Math.min(
          endRef.current,
          base.current +
            (current.current.status === "running"
              ? performance.now() - origin.current
              : 0),
        );
  const phase =
    configuration || timingValid
      ? phaseAt(Math.min(elapsed, Math.max(0, end - 0.01)), rhythm)
      : { index: 0, progress: 0, remaining: 0, key: "" };
  useEffect(() => {
    if (status !== "running") return;
    let frame = 0;
    const tick = () => {
      const now = base.current + performance.now() - origin.current;
      if (preparation.current) {
        setPreparationElapsed(Math.min(PREPARATION_MS, now));
        if (now >= PREPARATION_MS) {
          preparation.current = false;
          setInPreparation(false);
          // Preserve the deadline instead of moving the clock to the next frame.
          base.current = Math.max(0, now - PREPARATION_MS);
          origin.current = performance.now();
          setElapsed(base.current);
        }
        frame = requestAnimationFrame(tick);
        return;
      }
      if (now >= end) {
        base.current = end;
        setElapsed(end);
        transition("completed");
        audio.current.finish();
        return;
      }
      setElapsed(now);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, end]);
  useEffect(() => {
    if (status !== "idle") {
      setPreloading(false);
      return;
    }
    // Decode all assigned samples silently before enabling Start. Unlock still
    // happens on user input; loading never stretches the preparation countdown.
    let cancelled = false;
    setPreloading(true);
    void audio.current.warmup(soundSets[0], settings.rhythm).finally(() => {
      if (!cancelled) setPreloading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.sound, settings.rhythm, status]);
  useEffect(() => {
    audio.current.setVolume(settings.volume);
  }, [settings.volume]);
  useEffect(() => {
    audio.current.setMuted(muted || settings.sound === "silent");
  }, [muted, settings.sound]);
  useEffect(() => {
    if (inPreparation) return;
    if (status === "running" && ready)
      audio.current.run(soundSets[0], rhythm, currentElapsed(), end);
    else if (status === "paused") audio.current.pause();
    else if (status === "completed") audio.current.finish();
    else if (status === "idle") audio.current.stop();
    // No per-render cleanup: independent tails survive phase changes and normal
    // completion. Explicit controls and the unmount effect own cancellation.
  }, [status, ready, inPreparation]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden && current.current.status === "running") {
        pause();
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(
    () => () => {
      operation.current++;
      audio.current.stop();
    },
    [],
  );
  async function prepare(): Promise<TranslationKey> {
    await audio.current.unlock();
    await audio.current.prepare(soundSets[0], current.current.settings.rhythm);
    const state = audio.current.recordingStatus;
    return state === "recorded"
      ? "audioRecorded"
      : state === "partial"
        ? "audioSamplesPartial"
        : "audioSamplesUnavailable";
  }

  function cancelPreparation() {
    operation.current++;
    audio.current.stop();
    setPreparing(false);
  }
  function start() {
    if (!timingValid) return false;
    setConfiguration({
      rhythm: [...current.current.settings.rhythm] as Rhythm,
      end: finishAt(
        current.current.settings.minutes,
        current.current.settings.rhythm,
      ),
    });
    const ticket = ++operation.current;
    audio.current.stop();
    setReady(false);
    preparation.current = true;
    setInPreparation(true);
    setPreparationElapsed(0);
    base.current = 0;
    origin.current = performance.now();
    setElapsed(0);
    const sound = current.current.settings.sound;
    setPreparing(sound !== "silent");
    transition(document.hidden ? "paused" : "running");
    // Even silence mode keeps the phase-event ledger running. Unmuting later
    // enables future cues without replaying the current phase's strike.
    audio.current.setMuted(muted || sound === "silent");
    void prepare().then((message) => {
      if (ticket !== operation.current) return;
      setReady(true);
      setAudioStatus(message);
      setPreparing(false);
    });
    return true;
  }
  function stop() {
    cancelPreparation();
    preparation.current = false;
    setInPreparation(false);
    setPreparationElapsed(0);
    base.current = 0;
    setElapsed(0);
    setConfiguration(null);
    transition("idle");
  }
  function pause() {
    base.current = preparation.current
      ? Math.min(PREPARATION_MS, stageElapsed())
      : currentElapsed();
    if (preparation.current) setPreparationElapsed(base.current);
    else setElapsed(base.current);
    const completed = !preparation.current && base.current >= endRef.current;
    if (completed) audio.current.finish();
    else audio.current.pause();
    transition(completed ? "completed" : "paused");
  }
  async function resume() {
    if (current.current.status !== "paused") return;
    const ticket = operation.current;
    await audio.current.unlock();
    if (ticket !== operation.current || current.current.status !== "paused") return;
    origin.current = performance.now();
    transition("running");
  }
  async function preview() {
    if (preparation.current) return;
    // Retain the hidden preview control without losing paused sample offsets.
    if (current.current.status === "running") pause();
    const ticket = ++operation.current;
    setPreparing(true);
    const message = await prepare();
    if (ticket !== operation.current) return;
    setAudioStatus(message);
    setPreparing(false);
    setReady(true);
    if (current.current.settings.sound !== "silent")
      audio.current.preview(soundSets[0]);
  }
  async function changeSound(mode: string) {
    audio.current.setMuted(muted || mode === "silent");
    if (mode === "silent" || current.current.status === "idle") return;
    const ticket = ++operation.current;
    const message = await prepare();
    if (ticket !== operation.current) return;
    setAudioStatus(message);
    setReady(true);
    if (current.current.status === "running" && !preparation.current)
      audio.current.run(soundSets[0], rhythm, currentElapsed(), endRef.current);
  }
  function changeMuted(value: boolean) {
    setMuted(value);
    audio.current.setMuted(value || current.current.settings.sound === "silent");
    const ticket = operation.current;
    if (!value) void audio.current.unlock().then(() => {
      if (ticket !== operation.current) return;
      if (current.current.status === "running" && !preparation.current && ready)
        audio.current.run(soundSets[0], rhythm, currentElapsed(), endRef.current);
    });
  }

  return {
    status,
    inPreparation,
    preparationElapsed,
    elapsed,
    end,
    phase: { ...phase, duration: rhythm[phase.index] },
    muted,
    setMuted: changeMuted,
    preparing: preparing || preloading,
    audioStatus: preparing || preloading ? ("preparing" as const) : audioStatus,
    start,
    stop,
    pause,
    resume,
    preview,
    changeSound,
    cancelPreparation,
  };
}
