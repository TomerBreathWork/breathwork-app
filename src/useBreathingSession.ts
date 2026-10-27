import { PREPARATION_MS } from "./preparation";
import { useEffect, useRef, useState } from "react";
import { phaseAt, finishAt, type Rhythm } from "./engine";
import { validConfiguredRhythm } from "./duration-controls";
import { BowlAudio } from "./audio";
import { soundSets } from "./media";
import type { Settings } from "./settings";
import type { TranslationKey } from "./i18n";
export type SessionStatus = "idle" | "running" | "paused" | "completed";
export function useBreathingSession(settings: Settings) {
  const [status, setStatus] = useState<SessionStatus>("idle"),
    [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false),
    [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false),
    [revision, setRevision] = useState(0);
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
  const needsContinuation = useRef(false);
  const audio = useRef(new BowlAudio()),
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
        audio.current.stop();
        return;
      }
      setElapsed(now);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, end]);
  useEffect(() => {
    if (status !== "idle" || settings.sound !== "bowls") {
      setPreloading(false);
      return;
    }
    // Cache the unchanged model silently before enabling Start. Unlock still
    // happens on user input; loading never stretches the five-second countdown.
    let cancelled = false;
    setPreloading(true);
    void audio.current.warmup(soundSets[0]).finally(() => {
      if (!cancelled) setPreloading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.sound, status]);
  useEffect(() => {
    audio.current.setVolume(settings.volume);
  }, [settings.volume]);
  useEffect(() => {
    if (status !== "running" || inPreparation) return;
    if (ready && !muted && settings.sound !== "silent")
      audio.current.run(soundSets[0], rhythm, currentElapsed(), end);
    else audio.current.stop();
    return () => audio.current.stop();
  }, [status, muted, settings.sound, ready, revision, inPreparation]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden && current.current.status === "running") {
        pause();
        audio.current.stop();
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
  async function prepare(mode: string): Promise<TranslationKey> {
    await audio.current.unlock();
    await audio.current.prepare(
      soundSets[0],
      mode === "recordings" ? "recorded" : "synthesized",
    );
    const state = audio.current.recordingStatus;
    return state === "synthesized"
      ? "audioReady"
      : state === "recorded"
        ? "audioRecorded"
        : state === "partial"
          ? "audioPartial"
          : "audioFallback";
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
    needsContinuation.current = false;
    preparation.current = true;
    setInPreparation(true);
    setPreparationElapsed(0);
    base.current = 0;
    origin.current = performance.now();
    setElapsed(0);
    const sound = current.current.settings.sound;
    setPreparing(sound !== "silent");
    transition(document.hidden ? "paused" : "running");
    if (sound === "silent") {
      setReady(true);
      setAudioStatus("audioInitial");
    } else
      void prepare(sound).then((message) => {
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
    audio.current.stop();
    base.current = preparation.current
      ? Math.min(PREPARATION_MS, stageElapsed())
      : currentElapsed();
    if (preparation.current) setPreparationElapsed(base.current);
    else setElapsed(base.current);
    transition(
      !preparation.current && base.current >= endRef.current
        ? "completed"
        : "paused",
    );
  }
  async function resume() {
    const ticket = operation.current;
    await audio.current.unlock();
    if (ticket !== operation.current) return;
    if (needsContinuation.current && !preparation.current) {
      const now = currentElapsed();
      audio.current.run(soundSets[0], rhythm, now, now);
      needsContinuation.current = false;
    }
    origin.current = performance.now();
    transition("running");
  }
  async function preview() {
    if (preparation.current) return;
    // Preview while practicing would collide with phase audio. Pause first using
    // the existing session clock; never restart or reset the practice.
    if (
      current.current.status !== "idle" &&
      current.current.status !== "completed"
    )
      needsContinuation.current = true;
    if (current.current.status === "running") pause();
    const ticket = ++operation.current;
    audio.current.stop();
    setPreparing(true);
    const message = await prepare(current.current.settings.sound);
    if (ticket !== operation.current) return;
    setAudioStatus(message);
    setPreparing(false);
    setReady(true);
    if (current.current.settings.sound !== "silent")
      audio.current.preview(soundSets[0]);
  }
  async function changeSound(mode: string) {
    const ticket = ++operation.current;
    audio.current.stop();
    setReady(false);
    setPreparing(false);
    if (
      current.current.status === "idle" ||
      current.current.status === "completed" ||
      mode === "silent"
    ) {
      if (mode === "silent") {
        setReady(true);
      }
      return;
    }
    setPreparing(true);
    const message = await prepare(mode);
    if (ticket !== operation.current) return;
    const now = currentElapsed();
    // Initialize a prepared mode as a continuation, using an empty playback range.
    // The unchanged engine emits no source for this range; the next run seeks the
    // current phase instead of treating the mode change as a new session strike.
    if (!preparation.current) audio.current.run(soundSets[0], rhythm, now, now);
    needsContinuation.current = false;
    setAudioStatus(message);
    setReady(true);
    setRevision((value) => value + 1);
    setPreparing(false);
  }
  return {
    status,
    inPreparation,
    preparationElapsed,
    elapsed,
    end,
    phase: { ...phase, duration: rhythm[phase.index] },
    muted,
    setMuted,
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
