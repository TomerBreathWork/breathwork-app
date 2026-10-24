import { useEffect, useRef, useState } from "react";
import { phaseAt, finishAt, validRhythm } from "./engine";
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
  const needsContinuation = useRef(false);
  const audio = useRef(new BowlAudio()),
    operation = useRef(0),
    base = useRef(0),
    origin = useRef(0);
  const current = useRef({ status, settings });
  current.current = { status, settings };
  const timingValid =
    validRhythm(settings.rhythm) &&
    Number.isFinite(settings.minutes) &&
    settings.minutes >= 1 &&
    settings.minutes <= 120;
  const end = timingValid ? finishAt(settings.minutes, settings.rhythm) : 0;
  const endRef = useRef(end);
  endRef.current = end;
  function transition(next: SessionStatus) {
    current.current.status = next;
    setStatus(next);
  }
  const currentElapsed = () =>
    Math.min(
      endRef.current,
      base.current +
        (current.current.status === "running"
          ? performance.now() - origin.current
          : 0),
    );
  const phase = timingValid
    ? phaseAt(Math.min(elapsed, Math.max(0, end - 0.01)), settings.rhythm)
    : { index: 0, progress: 0, remaining: 0, key: "" };
  useEffect(() => {
    if (status !== "running") return;
    let frame = 0;
    const tick = () => {
      const now = base.current + performance.now() - origin.current;
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
    audio.current.setVolume(settings.volume);
  }, [settings.volume]);
  useEffect(() => {
    if (status !== "running") return;
    if (ready && !muted && settings.sound !== "silent")
      audio.current.run(soundSets[0], settings.rhythm, currentElapsed(), end);
    else audio.current.stop();
    return () => audio.current.stop();
  }, [status, muted, settings.sound, ready, revision]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden && current.current.status === "running") {
        base.current = currentElapsed();
        setElapsed(base.current);
        transition(base.current >= endRef.current ? "completed" : "paused");
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
  async function start() {
    if (preparing) return false;
    const ticket = ++operation.current;
    audio.current.stop();
    setReady(false);
    setPreparing(true);
    if (current.current.status !== "idle") {
      base.current = currentElapsed();
      setElapsed(base.current);
      transition("paused");
    }
    const sound = current.current.settings.sound;
    const message = sound === "silent" ? "audioInitial" : await prepare(sound);
    if (ticket !== operation.current) return false;
    needsContinuation.current = false;
    base.current = 0;
    origin.current = performance.now();
    setElapsed(0);
    setReady(true);
    setAudioStatus(message);
    setPreparing(false);
    transition(document.hidden ? "paused" : "running");
    return true;
  }
  function stop() {
    cancelPreparation();
    base.current = 0;
    setElapsed(0);
    transition("idle");
  }
  function pause() {
    audio.current.stop();
    base.current = currentElapsed();
    setElapsed(base.current);
    transition(base.current >= endRef.current ? "completed" : "paused");
  }
  async function resume() {
    const ticket = ++operation.current;
    await audio.current.unlock();
    if (ticket !== operation.current) return;
    if (needsContinuation.current) {
      const now = currentElapsed();
      audio.current.run(
        soundSets[0],
        current.current.settings.rhythm,
        now,
        now,
      );
      needsContinuation.current = false;
    }
    origin.current = performance.now();
    transition("running");
  }
  async function preview() {
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
    )
      return;
    setPreparing(true);
    const message = await prepare(mode);
    if (ticket !== operation.current) return;
    const now = currentElapsed();
    // Initialize a prepared mode as a continuation, using an empty playback range.
    // The unchanged engine emits no source for this range; the next run seeks the
    // current phase instead of treating the mode change as a new session strike.
    audio.current.run(soundSets[0], current.current.settings.rhythm, now, now);
    needsContinuation.current = false;
    setAudioStatus(message);
    setReady(true);
    setRevision((value) => value + 1);
    setPreparing(false);
  }
  return {
    status,
    elapsed,
    end,
    phase,
    muted,
    setMuted,
    preparing,
    audioStatus: preparing ? ("preparing" as const) : audioStatus,
    start,
    stop,
    pause,
    resume,
    preview,
    changeSound,
    cancelPreparation,
  };
}
