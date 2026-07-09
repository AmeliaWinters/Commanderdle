import ManaCost from "../ManaSymbols";
import { MdKeyboardArrowUp, MdKeyboardDoubleArrowDown } from "react-icons/md";
import { formatMoney, useCurrency } from "../../lib/currency";

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

export default function ExampleRow() {
  useCurrency();
  return (
    <div className="example-wrap" aria-hidden="true">
      <div className="grid-row example-row no-anim">
        <div className="grid-cell name-cell">
          <div className="cell-inner name-inner">
            <span className="name-text">Exampie, the Example</span>
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
            {formatMoney(4.11)}
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

    </div>
  );
}
