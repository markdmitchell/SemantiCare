# Empty-state placeholder for the FHIR panel

Replace the plain line "Click "Map to FHIR R4" to initiate semantic mapping." in the right panel with a calm, branded empty state.

## What it looks like
- Large, translucent site icon (the same heart-and-pulse logo, `/favicon.png`) centered in the panel, about 160px, roughly 12% opacity and slightly desaturated so it reads as a watermark.
- A gentle, slow "pulse" breathing animation on the icon (disabled for users who prefer reduced motion).
- Below it, a short heading: "FHIR R4 bundle will appear here".
- One line of guidance with corrected wording (the button is actually labeled "Process Clinical Message"): "Load a scenario or paste a message, then click Process Clinical Message."
- A small three-step hint row: Paste HL7 v2, Protect PHI, Review FHIR R4.
- No em dashes in any copy.

## Technical details
- Edit only the fallback branch in `frontend/src/Workbench.tsx` (around line 528).
- Use the existing public `/favicon.png` per the brand-mark rule; `alt=""` with `aria-hidden` since it is decorative.
- Use existing panel/semantic tokens in `frontend/src/index.css`; add a small `@keyframes` with a `prefers-reduced-motion` guard.
