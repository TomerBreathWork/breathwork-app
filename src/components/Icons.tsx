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
    | "mute";
}) {
  const paths = {
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
      {name === "globe" && <circle cx="12" cy="12" r="9" />}
      <path d={paths[name]} />
    </svg>
  );
}
