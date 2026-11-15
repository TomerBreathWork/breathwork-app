import {
  chooser, navigationKey, readEntry, readDraft,
  type Screen, type SetupScreen, type NavigationEntry, type NavigationDraft, type NavigationSnapshot,
} from "./navigation.ts";

type Status = "idle" | "running" | "paused" | "completed";
export interface NavigationHost {
  history: Pick<History, "state" | "pushState" | "replaceState" | "go">;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  queueMicrotask(callback: () => void): void;
}
interface Callbacks {
  pause(): void;
  stop(): void;
  restore(view: SetupScreen, draft?: NavigationDraft): void;
}
interface State { screen: Screen; exitPending: boolean; settling: boolean }
const isSelected = (s: Screen) => s.name === "home" && s.mode === "selected";
const isChooser = (s: Screen) => s.name === "home" && s.mode !== "selected";
const freshId = () => `bf-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Sole owner of same-document app history. Engine state never lives in history. */
export class NavigationController {
  private current: NavigationEntry;
  private entries = new Map<number, NavigationEntry>();
  private state: State;
  private listeners = new Set<() => void>();
  private started = false;
  private initialized = false;
  private traversalTicket = 0;
  private liveId: string | undefined;
  private status: Status = "idle";
  private pendingTarget?: NavigationEntry;
  private approvedTarget?: NavigationEntry;
  private callbacks: Callbacks;
  private host: NavigationHost;
  constructor(host: NavigationHost, callbacks: Callbacks, restored?: NavigationSnapshot) {
    this.host = host;
    this.callbacks = callbacks;
    const existing = readEntry(host.history.state?.[navigationKey]);
    // A fresh document resets presentation, not the browser's existing chain.
    // Retaining its indices lets Back/Forward reach pre-reload app entries safely.
    this.current = restored?.current ?? {
      owner: existing?.owner ?? freshId(), index: existing?.index ?? 0, view: { ...chooser },
    };
    for (const e of restored?.entries ?? []) this.entries.set(e.index, e);
    // A document reload cannot revive a running engine, even from an update snapshot.
    this.current = this.safeEntry(this.current);
    this.entries.set(this.current.index, this.current);
    this.state = { screen: this.current.view, exitPending: false, settling: false };
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  private publish(exitPending = this.state.exitPending, settling = this.state.settling) {
    this.state = { screen: this.current.view, exitPending, settling };
    this.listeners.forEach(fn => fn());
  }
  private write(entry: NavigationEntry, push = false) {
    const state = { ...this.host.history.state, [navigationKey]: entry };
    delete state.breathFlow; delete state.breathFlowView;
    this.host.history[push ? "pushState" : "replaceState"](state, "");
  }
  start = () => {
    if (this.started) return;
    this.started = true;
    if (!this.initialized) { this.write(this.current); this.initialized = true; }
    this.host.addEventListener("popstate", this.pop);
  };
  dispose = () => {
    this.started = false;
    this.host.removeEventListener("popstate", this.pop);
    this.host.removeEventListener("beforeunload", this.unload);
    this.traversalTicket++;
  };
  updateSession(status: Status) {
    this.status = status;
    this.host.removeEventListener("beforeunload", this.unload);
    if (this.protected()) this.host.addEventListener("beforeunload", this.unload);
    if (status === "completed" && this.pendingTarget) {
      this.pendingTarget = undefined;
      this.publish(false, this.state.settling);
    }
  }
  private protected() {
    return !!this.liveId && this.current.view.name === "session" &&
      this.current.view.id === this.liveId && (this.status === "running" || this.status === "paused");
  }
  private unload: EventListener = event => {
    if (!this.protected()) return;
    event.preventDefault();
    (event as BeforeUnloadEvent).returnValue = "";
  };
  private safeEntry(entry: NavigationEntry): NavigationEntry {
    if (entry.view.name !== "session" || entry.view.id === this.liveId) return entry;
    return { ...entry, view: entry.view.returnTo };
  }
  private accept(entry: NavigationEntry) {
    this.traversalTicket++;
    const safe = this.safeEntry(entry);
    const changed = safe !== this.current;
    this.current = safe;
    this.entries.set(safe.index, safe);
    if (safe !== entry) this.write(safe);
    if (changed && safe.view.name !== "session") this.callbacks.restore(safe.view, safe.draft);
    this.publish(false, false);
  }
  private actual() { return readEntry(this.host.history.state?.[navigationKey]); }
  private travel(target: NavigationEntry, restoring = false) {
    const ticket = ++this.traversalTicket;
    this.publish(this.state.exitPending, true);
    // History reconciliation must not depend on the breathing timer or wait
    // through a paused clock. Superseded traversals are coalesced here.
    this.host.queueMicrotask(() => {
      if (ticket !== this.traversalTicket || !this.started) return;
      const actual = this.actual();
      if (!actual || actual.owner !== target.owner) { this.publish(this.state.exitPending, false); return; }
      if (actual.index === target.index) {
        if (restoring) this.publish(!!this.pendingTarget, false);
        else { this.approvedTarget = undefined; this.accept(target); }
      } else this.host.history.go(target.index - actual.index);
    });
  }
  private pop: EventListener = () => {
    const target = this.actual();
    // Do not trap foreign history or create sentinel entries at root Home.
    if (!target || target.owner !== this.current.owner) return;
    this.entries.set(target.index, target);
    if (this.approvedTarget) {
      if (target.index === this.approvedTarget.index) {
        const approved = this.approvedTarget; this.approvedTarget = undefined; this.accept(approved);
      } else this.travel(this.approvedTarget);
      return;
    }
    if (this.pendingTarget) {
      if (target.index === this.current.index) {
        this.traversalTicket++;
        this.publish(true, false);
      }
      else this.travel(this.current, true);
      return;
    }
    if (this.protected() && target.index !== this.current.index) {
      if (this.status === "running") this.callbacks.pause();
      this.pendingTarget = target;
      this.publish(true, true);
      this.travel(this.current, true);
      return;
    }
    // Ended-session placeholders may resolve to the same selected Home. Back
    // should still return to the chooser rather than exposing duplicate setup.
    if (isSelected(this.current.view) && isSelected(this.safeEntry(target).view) && target.index < this.current.index) {
      const previous = this.previousChooser(target.index);
      if (previous) { this.approvedTarget = previous; this.travel(previous); return; }
    }
    // Leaving a completed session needs no confirmation, but still cleans up.
    if (this.current.view.name === "session" && target.index !== this.current.index) {
      this.liveId = undefined; this.callbacks.stop();
    }
    this.accept(target);
  };
  remember(draft: NavigationDraft) {
    if (this.current.view.name === "session" || this.state.settling) return;
    const valid = readDraft(draft);
    if (!valid || this.current.view.name === "library") return;
    this.current = { ...this.current, draft: valid };
    this.entries.set(this.current.index, this.current);
    this.write(this.current);
  }
  open = (view: SetupScreen, draft?: NavigationDraft) => {
    if (this.pendingTarget || this.state.settling) return;
    if (JSON.stringify(view) === JSON.stringify(this.current.view)) return;
    for (const index of this.entries.keys()) if (index > this.current.index) this.entries.delete(index);
    const entry = { owner: this.current.owner, index: this.current.index + 1, view, draft: readDraft(draft) };
    this.write(entry, true); this.accept(entry);
  };
  beginSession = (draft: NavigationDraft) => {
    if (this.current.view.name === "session") {
      this.liveId = freshId();
      this.current = { ...this.current, view: { ...this.current.view, id: this.liveId }, draft: readDraft(draft) };
      this.entries.set(this.current.index, this.current); this.write(this.current); this.updateSession("running"); this.publish(false, false);
      return;
    }
    const origin = this.current;
    this.liveId = freshId();
    const entry: NavigationEntry = { owner: origin.owner, index: origin.index + 1,
      view: { name: "session", id: this.liveId, returnTo: origin.view as SetupScreen, returnIndex: origin.index }, draft: readDraft(draft) };
    for (const index of this.entries.keys()) if (index > origin.index) this.entries.delete(index);
    this.current = entry; this.entries.set(entry.index, entry); this.write(entry, true); this.updateSession("running"); this.publish(false, false);
  };
  stay = () => {
    if (this.state.settling) return;
    this.pendingTarget = undefined; this.publish(false, false);
  };
  end = () => {
    if (this.state.settling || this.current.view.name !== "session") return;
    const origin = this.current.view;
    const target = this.pendingTarget ?? (origin.name === "session" ? this.entries.get(origin.returnIndex) ?? {
      owner: this.current.owner, index: origin.returnIndex, view: origin.returnTo, draft: this.current.draft,
    } : undefined);
    this.pendingTarget = undefined; this.liveId = undefined;
    if (target) {
      const destination = this.safeEntry(target);
      this.approvedTarget = destination;
      this.current = destination;
      this.entries.set(destination.index, destination);
      // Publish the destination before stopping the engine: there must be no
      // transient Home render/page_view when returning to Practice Details.
      if (destination.view.name !== "session") this.callbacks.restore(destination.view, destination.draft);
      this.publish(false, true); this.callbacks.stop(); this.travel(destination);
    } else this.callbacks.stop();
  };
  private previousChooser(before: number) {
    return [...this.entries.values()].filter(e => e.index < before && isChooser(e.view)).sort((a,b) => b.index-a.index)[0];
  }
  chooseHome = () => {
    const target = this.previousChooser(this.current.index);
    if (target) { this.approvedTarget = target; this.travel(target); }
    else { this.current = { ...this.current, view: { ...chooser } }; this.write(this.current); this.publish(false, false); }
  };
  back = () => { if (!this.state.settling) this.host.history.go(-1); };
  snapshotForUpdate = (): NavigationSnapshot | undefined => {
    if (this.state.settling || this.state.exitPending || this.protected()) return;
    return { current: this.safeEntry(this.current), entries: [...this.entries.values()] };
  };
}
