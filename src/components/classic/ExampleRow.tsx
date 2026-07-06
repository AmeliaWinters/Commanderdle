import ManaCost from "../ManaSymbols";
import { MdKeyboardArrowUp, MdKeyboardDoubleArrowDown } from "react-icons/md";

/** One hand-written demo cell; mirrors the markup GuessRow produces. */
function DemoCell({
  kind,
  children,
}: {
  kind: "exact" | "partial" | "none";
  children: React.ReactNode;
}) {
  return (
    <div className={`grid-cell match-${kind}`} role="cell">
      <div className="cell-inner">{children}</div>
    </div>
  );
}

/**
 * A static example guess shown to first-time players instead of the how-to
 * modal: teaches the green/yellow/grey + arrow language passively while
 * filling the otherwise-empty grid. Purely decorative - not a real guess.
 */
export default function ExampleRow() {
  return (
    <div className="example-wrap" aria-hidden="true">
      <div className="grid-row example-row no-anim">
        <div className="grid-cell name-cell">
          <div className="cell-inner name-inner">
            <span className="name-text">Exampie, the Clarifier</span>
          </div>
        </div>
        <DemoCell kind="exact">
          <span className="cell-text">Example Elf</span>
        </DemoCell>
        <DemoCell kind="partial">
          <ManaCost colors={["G", "W"]} size="20px" />
        </DemoCell>
        <DemoCell kind="none">
          <span className="cell-text">
            6
            <span className="cell-arrow">
              <MdKeyboardDoubleArrowDown size="20px" />
            </span>
          </span>
        </DemoCell>
        <DemoCell kind="partial">
          <span className="cell-text">
            $4
            <span className="cell-arrow">
              <MdKeyboardArrowUp size="20px" />
            </span>
          </span>
        </DemoCell>
        <DemoCell kind="none">
          <span className="cell-text">
            #212
            <span className="cell-arrow">
              <MdKeyboardDoubleArrowDown size="20px" />
            </span>
          </span>
        </DemoCell>
      </div>
      <p className="example-caption">
        <b className="ex-green">green</b> matches the secret commander,{" "}
        <b className="ex-yellow">yellow</b> is close, arrows point toward the
        answer, <b className="ex-gray">double/gray</b> = far off
      </p>
    </div>
  );
}
