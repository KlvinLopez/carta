# Design System Documentation: The Digital Sommelier

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Sommelier"**
This design system is built to bridge the tactile warmth of a Michelin-star dining room with the ethereal precision of augmented reality. We are moving away from the "utility app" aesthetic and toward a "Digital Curator" experience. 

To achieve this, we reject the rigid, boxy constraints of traditional mobile grids. Instead, we embrace **Organic Editorialism**: a layout philosophy characterized by generous white space, intentional asymmetry, and "floating" elements that feel like they are resting on a liquid surface. By blending the cleanliness of high-end travel platforms with the immersive "magic" of AR, we ensure the interface never competes with the food—it frames it.

---

## 2. Colors & Surface Philosophy
The palette is rooted in heritage and luxury. We use a "Crema" base to avoid the sterile coldness of pure white, paired with "Vino" for authoritative elegance.

### The "No-Line" Rule
**Strict Mandate:** 1px solid borders are prohibited for sectioning or containment. 
Boundaries must be defined through:
1.  **Tonal Shifts:** Placing a `surface-container-low` card against a `background` floor.
2.  **Negative Space:** Using the Spacing Scale to create "invisible containers."
3.  **Depth:** Using soft, ambient shadows to imply an edge without drawing one.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper and frosted glass.
*   **Base Layer:** `surface` (#fef9f1) — The "tablecloth" of the application.
*   **Secondary Layer:** `surface-container-low` — Used for grouped content like menu categories.
*   **Floating Layer:** `surface-container-lowest` (#ffffff) — Reserved for primary interactive cards (e.g., a Featured Dish).
*   **The Glass Rule:** For any UI overlaying the AR camera feed, use semi-transparent `surface` colors (60-80% opacity) with a `backdrop-blur` of 20px to 40px. This creates a "frosted glass" effect that keeps the focus on the 3D food model while maintaining legibility.

### Signature Textures
Main CTAs and hero headers should utilize a subtle linear gradient from `primary` (#4f1728) to `primary-container` (#6b2d3e). This adds "soul" and prevents the deep Vino tones from feeling flat or "muddy" on OLED screens.

---

## 3. Typography
We use a high-contrast typographic scale to create an editorial feel. The interplay between the serif (Playfair Display) and the sans-serif (Inter) creates a dialogue between tradition and technology.

*   **Display & Headlines (Playfair Display):** These are your "Hero" elements. Use `display-lg` for dish names and `headline-md` for section titles. Ensure tracking (letter-spacing) is set to -1% or -2% for a tighter, premium editorial look.
*   **Body & UI (Inter):** Used for descriptions, prices, and functional labels. `body-lg` is your workhorse. 
*   **The Price Tag:** Prices should always be rendered in `title-md` (Inter) with a slightly heavier weight than the surrounding body text to ensure instant scannability without breaking the elegant flow.

---

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering**, not structural lines.

*   **The Layering Principle:** Place a `surface-container-lowest` card on top of a `surface-container-low` background. The subtle shift in "creaminess" provides enough contrast for the human eye to perceive hierarchy without the need for a stroke.
*   **Ambient Shadows:** For "floating" elements (like a floating action button or an expanded AR modal), use an ultra-diffused shadow. 
    *   *Values:* `0px 20px 40px rgba(29, 28, 23, 0.06)`
    *   Note the use of a tinted shadow (using the `on-surface` color) rather than a neutral black. This mimics natural light reflecting off a warm surface.
*   **The Ghost Border:** If a boundary is required for accessibility (e.g., an input field), use the `outline-variant` token at 15% opacity. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Pill-shaped (`rounded-full`), using the Vino gradient. Text is `on-primary` (White), center-aligned.
*   **Secondary:** Pill-shaped, `surface-container-highest` background with `on-surface` text. No border.
*   **Interaction:** Use "Spring" animations (stiffness: 300, damping: 20) for all button presses to mimic the Pokémon GO "bouncy" tactile feel.

### Ingredient Chips
*   **Visual Style:** Rounded corners (`radius-md`). Background: `surface-container-high`.
*   **Content:** Instead of bullet points, use a leading Emoji (🌶️, 🌿) followed by `label-md` text. This adds a playful, modern "magic" to an otherwise dry list of ingredients.

### AR Glass Overlays
*   Used specifically when the user is viewing 3D food models.
*   **Style:** `surface` color at 70% opacity + `backdrop-filter: blur(24px)`.
*   **Edges:** Use `radius-xl` (32px) to make the digital elements feel soft and approachable.

### Cards & Lists
*   **Strict Rule:** No divider lines. Separate items using 16px or 24px of vertical white space.
*   **Image Focus:** Food photography and 3D models should "break the container." Allow 3D models to overlap the edge of a card to create a sense of three-dimensional space.

---

## 6. Do’s and Don'ts

### Do:
*   **Do** use asymmetrical margins. A dish description might be indented further than the title to create an editorial "ragged" look.
*   **Do** prioritize high-quality 3D assets. The UI is the frame; the food is the art.
*   **Do** use the Dorado (#B8860B) "Highlight" color sparingly—only for rewards, "Chef's Specials," or active states.

### Don’t:
*   **Don't** use 100% black (#000000). Always use `Deep Charcoal` (#1A1A1A) for text to maintain the warm, premium feel.
*   **Don't** use sharp corners. Everything must have a minimum radius of 20px unless it is a pill-shaped button.
*   **Don't** cram information. If a screen feels busy, increase the background-to-component ratio. Silence is luxury.
*   **Don't** use standard slide transitions. Use scale-fade and spring-based transforms to maintain the "magic" of the experience.