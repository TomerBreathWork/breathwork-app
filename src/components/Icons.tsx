export function Icon({
  name,
}: {
  name:
    | "play"
    | "pause"
    | "stop"
    | "restart"
    | "chevron"
    | "globe"
    | "sound"
    | "mute"
    | "share"
    | "message"
    | "help";
}) {
  const paths = {
    share: "M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7",
    message: "M4 4h16v12H9l-5 4ZM8 8h8M8 12h5",
    help: "M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-1 .7-1.9 1-1.9 2.4M12 17h.01",
    play: "M8 5v14l11-7Z",
    pause: "M8 5v14M16 5v14",
    stop: "M6 6h12v12H6Z",
    restart: "M4 9a8 8 0 1 1 1 9M4 4v5h5",
    chevron: "m6 9 6 6 6-6",
    globe: "M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18",
    sound: "m4 9 4 0 5-4v14l-5-4H4ZM17 8a6 6 0 0 1 0 8",
    mute: "m4 9 4 0 5-4v14l-5-4H4ZM17 9l5 6M22 9l-5 6",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(name === "globe" || name === "help") && (
        <circle cx="12" cy="12" r="9" />
      )}
      <path d={paths[name]} />
    </svg>
  );
}
