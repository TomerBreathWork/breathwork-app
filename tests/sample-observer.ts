// Browser-only instrumentation: observes real fetch/decode/playback, without
// replacing samples, changing scheduling or adding a production debug API.
export function observeSamples() {
  const state = (window as any).sampleAudio = {
    decoded: [] as { url: string; duration: number; channels: number }[],
    starts: [] as { url: string; at: number; offset: number; now: number; duration: number; stops: number[] }[],
    oscillators: 0,
  };
  const bytes = new WeakMap<ArrayBuffer, string>(), buffers = new WeakMap<AudioBuffer, string>();
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
    if (url.includes("/media/audio/")) {
      const read = response.arrayBuffer.bind(response);
      response.arrayBuffer = async () => { const data = await read(); bytes.set(data, url); return data; };
    }
    return response;
  };
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    async decodeAudioData(data: ArrayBuffer) {
      const url = bytes.get(data) ?? "unknown";
      const buffer = await super.decodeAudioData(data);
      buffers.set(buffer, url);
      state.decoded.push({ url, duration: buffer.duration, channels: buffer.numberOfChannels });
      return buffer;
    }
    createOscillator() { state.oscillators++; return super.createOscillator(); }
    createBufferSource() {
      const source = super.createBufferSource(), start = source.start.bind(source), stop = source.stop.bind(source);
      let event: (typeof state.starts)[number] | undefined;
      source.start = (...args) => {
        event = { url: buffers.get(source.buffer!) ?? "unknown", at: args[0] ?? 0, offset: args[1] ?? 0, now: this.currentTime, duration: source.buffer!.duration, stops: [] };
        state.starts.push(event); start(...args);
      };
      source.stop = (...args) => { event?.stops.push(args[0] ?? this.currentTime); stop(...args); };
      return source;
    }
  };
}
