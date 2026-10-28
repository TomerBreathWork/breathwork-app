import type { BreathingRoute } from "../practices";
/** Original frontal nose / neutral lips line art, sharing a 32px viewBox. */
export function BreathRouteIcon({ route }: { route: BreathingRoute }) {
  return (
    <svg
      className="breath-route-icon"
      data-route={route}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {route === "nose" ? (
        <>
          <path d="M13 5c0 8-1.5 11-4 14-2 2-1 5 2 5h2m6-19c0 8 1.5 11 4 14 2 2 1 5-2 5h-2M12 22c1-2 2-3 4-3s3 1 4 3M13 25c2 2 4 2 6 0" />
          <path d="M10 23h1m10 0h1" />
        </>
      ) : (
        <>
          <path d="M4 16c4-2 7-7 10-5l2 1 2-1c3-2 6 3 10 5-5 7-19 7-24 0Z" />
          <path d="M4 16c6-1 9 1 12 1s6-2 12-1" />
        </>
      )}
    </svg>
  );
}
