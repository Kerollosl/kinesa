import Mascot from "./Mascot.jsx";

// The game talks to companions in acts, not animation details. Today each act
// maps onto the painted rig plus a whole-body cartoon layer (squash, stretch,
// droop) that moves the character as one piece, so no joint can open. A
// future Rive character can take the same `act` values as state-machine
// inputs without the screens changing.
export const ACTS = ["idle", "wave", "cheer", "win", "sad"];

const RIG = {
  idle: { mood: "happy", action: "hello" },
  wave: { mood: "happy", action: "hello" },
  cheer: { mood: "celebrate", action: "celebrate" },
  win: { mood: "celebrate", action: "dance", dancing: true },
  sad: { mood: "happy", action: "hello" },
};

export default function Companion({
  kind,
  act = "idle",
  className = "",
  ...props
}) {
  const rig = RIG[act] || RIG.idle;
  return (
    <span className={`toon toon-${act} ${className}`} data-act={act}>
      <Mascot kind={kind} {...rig} {...props} />
    </span>
  );
}
