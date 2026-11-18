import Mascot from "./Mascot.jsx";

// The game talks to companions in acts, not animation details:
// idle, wave, cheer, win, sad (see src/companions/motion.js). The same
// characters star in the film in video/.
export { ACTS } from "../companions/motion.js";

export default function Companion({
  kind,
  act = "idle",
  className = "",
  ...props
}) {
  return (
    <span className={`toon ${className}`} data-act={act}>
      <Mascot kind={kind} act={act} {...props} />
    </span>
  );
}
