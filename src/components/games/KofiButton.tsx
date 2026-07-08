import { useEffect, useRef } from "react";

const KOFI_SRC = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";

declare global {
  interface Window {
    kofiwidget2?: {
      init: (text: string, color: string, id: string) => void;
      getHTML: () => string;
      draw: () => void;
    };
  }
}

// Renders the official Ko-fi "Support me" widget button. The widget ships as a
// script that expects document.write, so instead of injecting the raw <script>
// tags we load the script once and drop its generated markup into a container.
export default function KofiButton() {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const render = () => {
      const widget = window.kofiwidget2;
      if (!widget || !containerRef.current) return;
      widget.init("Support me on Ko-FI", "var(--panel-2)", "F5I022TEMZ");
      containerRef.current.innerHTML = widget.getHTML();
    };

    if (window.kofiwidget2) {
      render();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${KOFI_SRC}"]`,
    );
    if (!script) {
      script = document.createElement("script");
      script.src = KOFI_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener("load", render);
    return () => script?.removeEventListener("load", render);
  }, []);

  return <span style={{ margin: "1rem auto 0" }} ref={containerRef} />;
}
