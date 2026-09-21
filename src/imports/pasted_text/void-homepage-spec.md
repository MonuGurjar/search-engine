Use the attached VOID homepage screenshot as the **exact visual reference**. Do not redesign the UI. Recreate the existing composition, spacing, typography, proportions, colors, and hierarchy as closely as possible, then transform the static hero background into a subtle, premium 3D interactive environment.

### Core concept

VOID is my own private search engine. The homepage should feel like an independent, futuristic search engine rather than a generic AI landing page.

The current visual direction is:

- Light mode
- White / icy blue / soft grey environment
- Mint-green accent
- Minimal black typography
- Futuristic 3D landscape
- Large glowing planet
- Snowy mountain environment
- Reflective frozen-water surface
- Extremely clean search interface

Do NOT introduce excessive neon, cyberpunk styling, colorful gradients, or unnecessary UI.

### 3D Hero Environment

Convert the background into a layered 3D scene.

The scene should contain:

1. Large floating planet
   - Positioned behind the VOID logo
   - Very subtle slow rotation
   - Slight atmospheric glow
   - Soft translucent cloud/ice texture
   - Planet should feel physically present in the environment
   - Rotation should be extremely slow and elegant

2. Planetary atmosphere
   - Very subtle mint/green halo
   - Animated atmospheric particles
   - Soft volumetric light
   - No excessive glow

3. Mountains
   - Separate foreground, middle-ground, and background layers
   - Create real depth using parallax
   - Foreground mountains move slightly more than distant mountains
   - Movement should respond subtly to mouse movement

4. Clouds
   - Very slow horizontal movement
   - Different depth layers
   - Slight parallax
   - Soft and realistic
   - Do not distract from the search UI

5. Reflective water / ice
   - Subtle animated reflection
   - Very slow movement
   - Reflect the planet and sky
   - Add extremely subtle ripples
   - Preserve the bright clean appearance

6. Atmosphere
   - Tiny floating particles
   - Occasional soft light rays
   - Very subtle environmental movement
   - The page should feel alive even when the user does nothing

### Mouse interaction

Add premium, restrained parallax.

Mouse movement should affect:

- Planet: ±4–6px
- Clouds: ±8–12px
- Mountains: ±10–18px
- Foreground environment: ±15–25px
- Atmospheric particles: slightly more movement

Use smooth interpolation / spring-like easing.

Never make the movement feel like a cheap 3D tilt effect.

The search interface, navigation, and typography should remain comparatively stable.

### Scroll interaction

Create a cinematic scroll transition.

At the beginning:

```text
VOID
     ↓
Planet
     ↓
Mountains
     ↓
Search
     ↓
Reflective landscape
```

As the user scrolls:

- Camera subtly moves forward
- Planet gradually moves upward
- Mountains expand with depth
- Reflection changes naturally
- Atmospheric layers move at different speeds
- Hero content transitions into the next section
- Do not abruptly zoom or rotate the entire page

The transition should feel like moving forward through the VOID environment.

### Search interaction

The search bar must remain the primary interactive element.

Keep:

- Search icon
- "Search the web..." placeholder
- Search button
- Web
- Images
- News
- Videos
- Academic
- Code

On focus:

- Slightly increase glass/reflection intensity
- Very subtle mint border
- Soft shadow
- No excessive glow

On typing:

- Maintain the same visual hierarchy.

On pressing Enter:

- Navigate to the search-results page using the existing backend/API.

Do NOT create fake search results or fake functionality.

### UI motion

Navigation:

- Very subtle fade/slide on page load
- Hover transitions around 150–250ms
- Settings button gets a restrained mint interaction state

VOID logo:

- Initial soft fade-in
- The "O" can have a subtle atmospheric pulse
- Do not constantly animate the entire logo

Category buttons:

- Smooth hover elevation
- Small background transition
- Active Web state uses the existing mint accent

### Performance

This must feel like a real production website.

Prefer:

- CSS transforms
- GPU-accelerated animation
- requestAnimationFrame where required
- Three.js / React Three Fiber only if genuinely useful
- lazy loading for heavy assets
- compressed textures
- low-poly distant geometry
- reduced particle counts on mobile

Do NOT make the entire background one huge WebGL scene if layered CSS/DOM/canvas can achieve the effect more efficiently.

### Responsive behavior

Desktop:

Full 3D cinematic environment.

Tablet:

Reduce particle count and parallax intensity.

Mobile:

- Keep planet
- Keep mountains
- Keep search UI
- Reduce 3D depth
- Disable expensive effects where necessary
- Preserve performance
- Keep the search bar immediately accessible

Respect:

```text
prefers-reduced-motion
```

When enabled, replace continuous animations with a mostly static scene and minimal transitions.

### Visual quality target

Think:

**Apple-level restraint + futuristic sci-fi environment + premium search engine.**

Not:

- Cyberpunk
- Gaming UI
- Hacker dashboard
- Excessive glassmorphism
- Excessive neon
- AI-generated-looking animations

The final result should look like:

> "A real search engine built inside a living 3D world."

### Important implementation rule

The screenshot is the **design source of truth**.

Do not change:

- Overall composition
- Search bar position
- Logo scale
- Navigation placement
- Category layout
- Color direction
- Typography hierarchy

Only add depth, lighting, motion, parallax, environmental animation, and cinematic scroll behavior.

Before implementation, inspect the existing project and reuse its current components, routing, API calls, styling system, and assets wherever possible. Do not unnecessarily replace the existing architecture.