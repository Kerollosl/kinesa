import Mascot from "./Mascot.tsx";
import type { MascotProps } from "./Mascot.tsx";

// The game talks to companions in acts, not animation details. Today each act
// maps onto the painted rig plus a whole-body cartoon layer (squash, stretch,
// droop) that moves the character as one piece, so no joint can open. A
// future Rive character can take the same `act` values as state-machine
// inputs without the screens changing.
export const ACTS = ["idle", "wave", "cheer", "win", "sad"] as const;
export type Act = (typeof ACTS)[number];

const RIG: Record<Act, Pick<MascotProps, "mood" | "action" | "dancing">> = {
  idle: { mood: "happy", action: "hello" },
  wave: { mood: "happy", action: "hello" },
  cheer: { mood: "celebrate", action: "celebrate" },
  win: { mood: "celebrate", action: "dance", dancing: true },
  sad: { mood: "happy", action: "hello" },
};

export interface CompanionProps extends MascotProps {
  act?: Act;
}

export default function Companion({
  kind,
  act = "idle",
  className = "",
  ...props
}: CompanionProps) {
  const rig = RIG[act] || RIG.idle;
  return (
    <span className={`toon toon-${act} ${className}`} data-act={act}>
      <Mascot kind={kind} {...rig} {...props} />
    </span>
  );
}
