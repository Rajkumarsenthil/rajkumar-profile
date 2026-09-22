/**
 * Render layers. The sea's mirror camera only sees layer 0, so anything on
 * NO_REFLECTION is drawn normally but never reflected: the surf and sand that sit
 * on the water plane (which would shimmer and double up in the reflection) and
 * the floating titles.
 */
export const NO_REFLECTION = 1;
