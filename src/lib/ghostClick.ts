// Touch devices synthesize a `click` ~after a `mousedown`. Because we submit a
// guess on the autocomplete item's `mousedown`, that ghost click lands wherever
// the finger was once the list has been replaced by the results view - typically
// on the answer card's CardZoom anchor, popping open an unwanted zoom.
//
// Guesses record the moment they submit here; CardZoom ignores opening clicks
// that arrive within this window so the stray ghost click is swallowed.

let lastGuessAt = 0

export function markGuessSubmitted() {
  lastGuessAt = Date.now()
}

export function isGhostClick(windowMs = 700) {
  return Date.now() - lastGuessAt < windowMs
}
