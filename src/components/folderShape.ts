// Samsung Notes folder glyph, in a viewBox 100 units wide.
// The body has a raised tab on the left (where the count sits) that drops along
// a smooth S-curve into a lower front; the coloured flap peeks above that front
// and its rounded end flows into the body's top-right corner.

/** Folder height in viewBox units (Samsung Notes' folder tile: 224 x 174px on a 1080px screen). */
const H = 77;
/** Corner radii: the tab's top-left, the front's top-right, and the bottom corners. */
const R_TAB = 9;
const R_FRONT = 7;
const R = 10;
/** Height of the step from the left tab down to the front. */
export const STEP = 13.8;

/** Room around the glyph so its drop shadow and outline aren't clipped by the canvas. */
export const SHADOW_PAD = 20;

export const FOLDER_VIEW_BOX = `${-SHADOW_PAD} ${-SHADOW_PAD} ${100 + SHADOW_PAD * 2} ${H + SHADOW_PAD * 2}`;
export const FOLDER_ASPECT = H / 100;

/**
 * Coloured back flap: peeks above the front, 3.5 units below the tab's top, and its
 * rounded right end sinks into the front's top-right corner. Its left end hides
 * behind the tab's S-curve.
 */
export const FOLDER_FLAP = `M45 3.5L86 3.5Q96.5 3.5 97.5 ${STEP + 2}L97.5 ${STEP + 6}L45 ${STEP + 6}Z`;

/** Body: rounded left tab, a smooth S-curve down to the front, then the front with rounded corners. */
export const FOLDER_BODY =
  `M0 ${R_TAB}Q0 0 ${R_TAB} 0L40 0C47 0 50 ${STEP} 57 ${STEP}` +
  `L${100 - R_FRONT} ${STEP}Q100 ${STEP} 100 ${STEP + R_FRONT}` +
  `L100 ${H - R}Q100 ${H} ${100 - R} ${H}L${R} ${H}Q0 ${H} 0 ${H - R}Z`;
