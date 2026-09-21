The user has approved the implementation plan. Let me now execute it. This is a complex refactor involving multiple files. Let me create a task checklist and then start implementing.

Let me plan the execution order:

Create src/hooks/useScrollProgress.ts - the scroll progress hook
Create src/components/ScrollHero.tsx - the main scroll-driven hero component
Modify src/components/Scene.tsx - add scrollProgress prop for sphere animation
Modify src/components/Results.tsx - simplify (remove search bar, pills, back button)
Modify src/App.tsx - complete restructure
Update src/index.css to remove the smooth scroll behavior and add any styles needed
Delete src/components/Home.tsx since its functionality now lives in ScrollHero
Build and verify everything works together
I'm mapping out the dependencies between files before diving in — useScrollProgress has none, ScrollHero depends on several existing components plus the new hook, and Scene needs the scrollProgress prop wired through. Given the interdependencies, I need to work through this in careful order rather than parallelizing everything.

I decide it's better to implement this myself since the components are tightly coupled, so I'll create the hook first with helper functions for clamping values, applying smoothstep easing, and checking for reduced-motion preference...

then build out the scroll listener logic that snaps progress to 0 or 1 when reduced motion is on, otherwise animates smoothly based on scroll position.

Actually, using React state here would trigger re-renders every frame, which isn't what the plan calls for—I should be using refs and direct DOM manipulation instead. Let me reconsider how to expose this scroll progress: App.tsx needs it as a prop for Scene and ScrollHero, but both of those should apply transforms via refs to avoid unnecessary re-renders.

The best approach is a ref-based system: a hook maintains a ref holding the current eased scroll value, and any component that needs it runs its own rAF loop reading from that shared ref, rather than relying on React state updates that would cascade re-renders through the tree.

Actually, Scene.tsx already has its own rAF loop tracking scroll, so I can compute sphere transforms right inside that existing loop rather than sharing state. ScrollHero can similarly run its own loop to compute t and apply transforms independently, meaning the hook doesn't need to be shared at all—each component derives t from scrollY on its own.

Writing the progress hook...

I realize this setup creates two separate rAF loops, which is wasteful — better to consolidate everything into a single rAF loop inside ScrollHero instead of splitting it across the hook and the component.

Actually, I'll simplify further and drop the shared hook entirely. Each component that needs scroll progress will just track it independently in its own rAF loop, reading window.scrollY, smoothing and easing the value, then applying transforms directly to its own refs. ScrollHero handles its transforms this way, and Scene folds sphere transform logic into the rAF loop it already runs for mouse and scroll tracking — no shared state, no re-renders. I'm now checking whether App.tsx actually needs access to that progress value for layout decisions, and it seems like it doesn't, since the scroll spacer and results section don't depend on it directly.

Now I'm writing ScrollHero.tsx, setting up props for query, mode, and search/home callbacks, plus a clamp helper for the scroll math.

Adding refs for the wordmark, tagline, search, pills, and scroll indicator elements, then setting up a media query effect to detect mobile viewport and adjust the mark size accordingly, before starting on the scroll animation loop.

Calculating wordmark position...

Still writing scroll transform logic...

Now I'm adding a search handler that triggers the search callback and smoothly scrolls to the results area, then starting the layout for the fixed navigation overlay with a search row.

Adding a settings button with a gear icon that rotates on hover, then setting up the wordmark that starts centered and will transform to the top-left corner when clicked to go home.

Adding mode pills and a scroll indicator below the search bar...

actually I realize I need to double check the search bar's centering transform since I'm combining a translateX(-50%) with a dynamic translate3d in the animation loop, so I need to verify the two don't conflict at initial render.

Still refining transform math...

I realize the transform order matters here: since translate(-50%, 0) is applied last, it operates relative to the already-scaled element, meaning the centering offset shrinks as scale decreases, which actually works out correctly for keeping things centered.

With transform-origin set to center top, scaling shrinks the element symmetrically inward while translateX(-50%) keeps it horizontally centered regardless of scale, and translateY controls the top edge position independently.

Now I'm reconsidering the approach entirely and thinking a wrapper div for centering with scroll transforms applied to an inner element would be simpler than fighting with percentage-based translate math.

The search bar's horizontal centering stays consistent since the results layout is also centered, just wider. For the wordmark, I need the same nested approach - an outer div centering it, and an inner div that translates and scales it toward the top-left position at scroll completion.

Since the outer div already handles the -50% translateX centering, the inner div's translation needs to be relative to that already-centered position, meaning I should think of the inner div's origin as the center point, not the corner, to get the math right for interpolating between center and top-left placement.

Since the scale happens after translation, the center stays fixed in place while shrinking, so I can compute the delta in JS as the target pixel position minus the current viewport-relative center. I still need to make sure the shrunk wordmark with its ring looks good as a small logo at that final position.

Now I'm figuring out the exact padding used in the Header component to match where the logo should land at the end of the transition.

I'm deciding to skip building a separate hook for scroll progress and instead compute it directly inside the ScrollHero and Scene components. Starting to write out ScrollHero.tsx now, importing icons and setting up state.

Building the ScrollHero component now, setting up refs for the wordmark, tagline, search bar, pills, and scroll indicator, plus a media query check for mobile responsiveness.

I'm adding a scroll-driven animation loop that computes transition progress based on viewport height and scroll position, smoothing the transition toward a target value with a diff calculation.

Computing the interpolated transform for the wordmark, then fading and lifting the tagline out as the transition progresses, and starting on the search bar's position transition next.

Still writing animation transforms...

Adding nav links and a glassy button...

Writing wordmark and tagline layout...

Adding the scroll-to-explore indicator with a bouncing chevron icon. Now I'm realizing there's an issue with how SearchBar's onSubmit works — it calls onSubmit with the trimmed value, but in ScrollHero I need to handle the submission by first setting the value and then triggering the actual search.

I'll wire ScrollHero's handleSubmit to call onSearch with the query and then smoothly auto-scroll down to the results area once submitted.

But I realize value is local state in ScrollHero, so if the user scrolls back up to the hero after searching, the search bar won't reflect the current query unless I sync it. I want the hero's bar to stay empty for fresh searches but the compact bar to display the active query, so I need to reconcile that behavior.

Now I'm moving to the Scene component, where I need to wire sphere position and scale transforms into the existing animation loop driven by scroll progress and mouse position.

Still writing scroll transform logic...

Combining the transform...

Computing scroll-based interpolation...

I realize I should use the raw scroll value sy for the scroll progress calculation, but the smoothed csy for the parallax offset itself, since those serve different purposes. I need to make sure I'm pulling sy directly from the scroll handler rather than conflating it with the smoothed variable.

With the design settled, I'm ready to start writing the halo opacity logic and then move into building out the App.tsx structure with state for mode and query, pulling together the Footer, ScrollHero, Scene, modes, and Wordmark components.

Writing results list markup...

Now I'm working out the spacer height math for the scroll transition—thinking it should scale with viewport height plus the transition distance, adjusting for mobile where the transition height is shorter.

Actually, since the hero is fixed, it already fills the viewport regardless of the spacer's content — the spacer just needs to supply scroll distance for the transition, so it should be about transitionHeight tall rather than 200vh, with results appearing right after it.

Once the spacer has scrolled past, results sit at the viewport top but get covered by the still-fixed compact header, so results need enough paddingTop to clear it. I'm estimating that compact header height by summing the wordmark, search bar, and mode pills positions at the end state, landing around 180px of padding needed.

Right, so at scrollY equal to the spacer height, the results content's top edge aligns exactly with the viewport top, meaning it would sit directly under the fixed compact header. That means the results container needs roughly 180px of top padding so its content clears the header instead of hiding beneath it.

Right, so results should appear at viewport position 180px right when the transition finishes, meaning the results content needs paddingTop of 180px so it lands below the compact header instead of leaving a blank gap.

Now I'm setting up the spacer and results container structure in the layout...

But I realize if there's no query, the total scrollable height is just the spacer plus footer, so the user could scroll into the compact header state with an empty page, which feels unfinished. I should think about handling that edge case, perhaps by having the hero resist collapsing fully when there's no search query.

I think scrolling to exactly transitionHeight makes sense—at that point the transition completes and results start right at the viewport top behind the compact header, letting the user scroll slightly more to see them slide up. I'll stop overthinking this detail and just start coding, adjusting during testing, and also plan the "back to hero" flow where clicking the compact logo resets the query and returns home.

For the scroll-back behavior, I want the search bar's value to stay in sync with the query prop so it shows the last search when returning to hero, letting users clear it manually to start fresh—I'm considering syncing local state to the query prop via an effect.

I'll go with option 2: keep the query intact and just scroll to top when going home, so results persist and the user can scroll back to see them without losing their search.

Now I want to slim down Results.tsx so it only renders the results list itself, stripping out the search bar, mode pills, and back button since those will live elsewhere in the new layout. Writing the simplified results component...

Finishing the closing wordmark and footer label, then I'll move on to actually writing out the files—starting with a task list before implementing each component. I'm also considering whether the global smooth scroll-behavior on html could conflict with the JS-driven window.scrollTo calls, though since both use smooth scrolling the effect should be consistent.

I'll remove the CSS scroll-behavior and rely purely on JS-based smooth scrolling instead, since the rAF loop reads the live scroll position regardless. With that settled, I'm ready to begin implementing the files in order.

I also need to handle the reduced-motion case in ScrollHero -- skipping scroll-driven transforms and instead using a simple CSS opacity crossfade between the hero and results layouts based on scroll threshold.

Since CSS alone won't stop JS-driven transforms, I realize I need to branch in the tick function itself: snap directly to the target value when reduced motion is on, otherwise interpolate smoothly. This keeps the scroll-linked transition working for everyone, just without easing for those who need it — the most accessible path forward. Now I'm ready to actually write the implementation, starting with figuring out the right height for the scroll spacer.

Since the hero is fixed and only overlays content, the spacer just needs to span the transition distance — but I need to trace through what's visible at each scroll position to make sure the results section lands correctly beneath the fold as the user scrolls down.

By the time scrollY reaches 100vh, the transition completes and the compact header covers the top of the viewport while results scroll into place underneath. The tricky part is the mid-transition zone where results might peek through behind the semi-transparent hero elements, so I should add a background layer to mask that.

I'm reconsidering the spacer approach—making it taller so results don't peek through early, but adding an opaque background to the spacer would block the scene behind it since it sits in the main document flow rather than behind the fixed layers. I need another way to hide results until the right scroll point.

Instead, I'll make results content itself carry the top padding so the scene stays visible during that scroll distance, with a fallback spacer when there's no query yet.

Checking the math confirms this works cleanly: at scrollY=100vh, the results content lands exactly at the bottom edge of the fixed compact header, and continues scrolling normally beneath it while the header stays pinned. Without a query, scrolling past that point just reveals empty scene background beneath the compact header.

I'm settling on making the transition height responsive—smaller on mobile since there's less content to scroll through—by deriving it from window.innerHeight directly in JS rather than relying on CSS vh units, which avoids mismatches from mobile browser toolbar behavior. Now I'm sketching out the final file structure for the components and hooks needed to implement this.

I'm calculating the compact header height by estimating the bottom positions of the wordmark, search bar, and pills after their scale transitions, landing on roughly 190px including buffer space, then cross-checking against the actual transform values for each element's position and scale at the transition endpoint.

I realize there's an overlap issue between the wordmark bottom and search bar top, so I need to adjust the compact positions — wordmark centered at y=28px giving a bottom of 41px, and search bar centered at y=78px giving a top of 51px, leaving a comfortable 10px gap between them.

I need to figure out the wordmark's actual pixel position in the hero, since it's centered horizontally with translateX(-50%) and placed at 36% from the top -- I'll need to translate this percentage-based positioning into the dx/dy offsets used by the scroll transform to get it landing correctly at the target header position.

Actually, this math is getting messy—let me simplify by splitting into a wrapper div that handles the centering purely in CSS and never gets touched by JS, while an inner div receives all the scroll-driven transforms starting from an identity transform.

This confirms the math works with the origin at the center, since scaling toward center keeps that point fixed while translating repositions it to the target coordinates. I'm now considering transform order carefully, since applying scale before translate versus after changes how the offsets need to be calculated for the search and pills wrappers.

So the scaled element, meaning translate happens in the element's local coordinate system after scaling is applied. But testing this against actual pixel values shows translate3d with fixed pixel offsets moves by that literal amount regardless of the scale factor applied afterward, which confirms translation isn't affected by the preceding scale in practice.

So the translate is applied in the parent's coordinate system after scaling, meaning it directly shifts the element's center position without being affected by the scale factor. So I can compute dx and dy as simply the difference between the desired final center position and the original center position.

I need to double-check the outer div's centering offset since it uses left: 50%; translateX(-50%), while the inner div's transform is relative to the outer div's own box, so these two transforms compose independently rather than sharing a coordinate origin.

Working through the coordinate math, I realize since the outer div's top edge sits at 36vh rather than its center, the inner div's translated center actually lands at 50vw+dx horizontally but 36vh+wordmarkHeight/2+dy vertically, meaning there's an extra height offset I need to account for.

Working out that the center lands at 376px from the top, giving a dy of -348px at t=1, and confirming the scaled-down wordmark ends up positioned like a typical header logo. I'm now switching to using percentage-based centering with a transform offset for cleaner positioning code.

Writing the transform-based layout...

Actually the margin approach is getting messy, so I'm switching to a flex column layout instead—a fixed full-screen container with the nav pinned at top, a flexible spacer pushing content down, and the hero wordmark centered in the remaining space using natural flex behavior rather than manual transforms.

No transforms are needed at t=0 since flexbox handles the initial layout; the real work is measuring each element's actual position in a useEffect so I can compute deltas to their compact-layout targets at t=1. Measuring hero positions...

But this approach is fragile—layout timing on first render, window resize invalidating measurements—so I'm reconsidering and going back to fixed absolute positioning for each element instead, trying to be more precise about placement this time.

I'm computing the visual center coordinates and interpolating the wordmark's position and scale between its hero placement and the target navbar spot, applying the transform to the inner element separately from the outer centering transform—realizing I need to account for both transforms being on different elements.

I'll apply this same wrapper-div pattern to the tagline and search bar, centering each with absolute positioning and using margin offsets to fine-tune their vertical placement.

Calculating the pills' upward translation from center to near the top, confirming both elements shift dramatically as the layout compacts. For the tagline, I decide it should simply fade out via opacity rather than reposition, disappearing early in the transition.

Now I'm ready to actually write out all the implementation files, starting with a task tracker before working through ScrollHero and SearchBar. I trace the interaction flow: the user presses Enter in SearchBar, which triggers the submit handler that passes the trimmed query up to ScrollHero.

handleSubmit, which notifies App and smoothly scrolls to the transition height. I also confirm that the search bar's local value state persists correctly whether the user scrolls back up or reloads with an empty query.

Given the tight coupling between components, I decide to implement everything myself sequentially rather than splitting across subagents. I'll delete Home.tsx since it's unused, and instead of keeping Header.tsx separate, I'll inline its nav logic directly into ScrollHero.tsx to avoid duplicating the Settings button and nav links, then remove Header.tsx from App.tsx.

My plan is set: create the task file, build ScrollHero.tsx, modify Scene.tsx, App.tsx, and index.css, simplify Results.tsx, remove the old Home/Header files, then build and test. Before diving in, I'm double-checking the compact header sizing math -- wordmark and search bar positioning at the collapsed scroll state to make sure nothing overlaps.

Checking the actual header padding values: wordmark sits at 24px top padding with 26px height giving a center around 37px, while the search bar starts at 16px padding below the header and pills follow 20px further down.

I'm trying to estimate the wordmark's pixel width and center position based on letter sizing and gaps, but deciding it's not worth over-calculating -- I'll just pick reasonable initial values now and fine-tune positioning during actual testing.

I'll finalize the compact header heights at 170px desktop and 148px mobile, then move on to actually coding this. Scaling the search bar down is the right call since the user wants a smooth visual transformation rather than a component swap, and slight font-size shrinkage during the scroll animation won't matter since the text isn't meant to be read mid-transition.

That should stay usable even at 82% scale, as long as it doesn't shrink below roughly 280px, so this approach works fine.

Now I'm ready to implement everything. My plan: build ScrollHero.tsx, update Scene.tsx to animate the sphere, rewrite App.tsx, simplify Results.tsx, adjust index.css, and remove the old Home.tsx and Header.tsx references, then test the build. I'll start writing files, tackling ScrollHero.tsx and Scene.tsx together since they're independent.

Since edits to a single file can't run in parallel, I'll focus on writing ScrollHero.tsx first, setting up its props for mode selection and search, then move to Scene.tsx and App.tsx in sequence.

Building ScrollHero component...

Setting up refs for direct DOM manipulation on scroll and adding a mobile breakpoint listener, then starting the scroll-driven animation effect.

Computing smooth scroll progress with easing and interpolation...

Adding tagline fade and search bar transform logic...

Finishing the fade calculation, then setting up the animation loop that reruns when the breakpoint changes. I'm also adding submit and home handlers that scroll the page smoothly to the right position, and defining responsive sizing for the hero element.

Building the navigation overlay now with the top-right nav links...

Now I'm positioning the wordmark centered in the hero area as a clickable home link, and setting up the tagline container beneath it...

Adding the mode pills positioning and a bouncing scroll indicator with a chevron icon at the bottom...

Now I'm reconsidering the tagline positioning—it's currently placed just below the wordmark with a small margin, but in the absolutely-positioned scroll-driven layout, I need the tagline to align at the same vertical offset relative to the wordmark height instead of relying on margin spacing.

Adding a fade and slight upward lift to the tagline as it disappears, tied to the animation progress. I'm also double-checking that the hero's responsive sizing still lines up correctly with the wordmark's center position when the mobile state toggles.

Working through the offset math now — since the ref is anchored to the inner div's top-left corner, I need to convert the desired center-target into a top-left translation, factoring in half the wordmark's width and height so the visual center lands where I want it.

Since the outer div is centered relative to its own width, which matches the wordmark width, the hero's starting center is at horizontal midpoint and 0.36 viewport height plus half the hero size vertically. I'm now computing the horizontal and vertical offsets needed to interpolate from that starting position to the target coordinates over time.

For desktop dimensions with a 104px hero and 900px viewport height, the vertical shift comes out to about -340px, and for mobile with a 68px hero and 800px height it's around -292px -- both fairly large upward translations, which should work fine for the transition animation.

I'm double-checking the transform-origin logic: with center-center origin, scaling shrinks the element toward its own center, and then the translate moves that scaled center to the target position, so the math should hold up correctly.

The math checks out, so I can move forward with implementation. Now I'm figuring out the search bar's actual position: its wrapper is centered horizontally at 50vw with the top at 54vh, so I need to calculate the search bar's vertical center by accounting for its height, which varies depending on whether it's in compact mode.

I'm working out the vertical positioning: with the wordmark centered around 36px and its bottom near 49px, I'm adding a small gap so the search bar top lands around 60px, aligning it under the compact wordmark similar to how the results view stacks header and search.

Then I'm calculating the translate distance needed to move the search bar from its default scroll position to that target, getting roughly -426px, and doing the same math for the pills row underneath, landing on about -445px so it settles just below the search bar with a clean gap.

But since these elements also scale down as they animate, I realize the transform-origin at center-top complicates things—shrinking pulls the bottom edge upward while the top stays fixed, so the visual center shifts too, meaning I need to factor that into the final position calculation rather than treating translate and scale independently.

Working out the compact layout stack, I land on a total header height around 174px, which I'll round up to 180px for the results padding to give a little breathing room below the pills. I also note the pills container is scaled down proportionally but stays centered since the transform preserves centering, so I'm ready to move on to writing the actual code.

Now I'm double-checking the transform math for the search bar's shrink animation—since the transform-origin is set to center top, the scale should keep the top edge anchored while the translate offset positions it correctly, so I need to verify the order of translate versus scale in the CSS transform to make sure the top alignment works out as expected at the final state.

Writing the pill animation logic...

Finishing the wordmark transform logic... Now I'm ready to actually implement the files, starting with modifying Scene.tsx to wire scroll progress into the sphere component.

Computing sphere position...

Still writing transform logic...

I realize I need to double check how the percentage-based centering interacts with the pixel offsets, since the translateX(-50%) is relative to the element's own width, not the viewport.

Good, that confirms centering at 50vw. Now I'm calculating the sphere's actual center coordinates factoring in the max-size cap of 520px, then working out the delta values needed to animate it to the target position behind the wordmark, with scale collapsing to zero at the end.

I should scale the parallax by (1 - st) so it fades out as the sphere transitions, rather than staying constant. But I realize the existing code sets the transform through CSS variables and calc() expressions, so if I override it directly via JS ref, I'll lose that calc-based approach — I need to compute the entire transform value in JS instead of relying on CSS custom properties.

Still writing tick function...

Finishing the transform and opacity calculation... CSS calc() does work fine in inline styles set via JS. I still need to derive the sphere's pixel size from viewport width capped at 520px, then use that to compute the hero-state center coordinates.

I'm setting the top offset percentage per breakpoint and deciding to stop over-analyzing and start implementing -- building a task list then writing the files one by one, including fading the halo glow in sync with the sphere's scroll opacity.

The sphere image also has a continuous pulsing scale animation, and I'm confirming that since parent and child transforms compose correctly, this pulse naturally shrinks along with the scroll-driven scale so it stays imperceptible at small sizes without needing extra logic.

Now it's time to actually write the code. I'm planning App.tsx with state for mode and query, rendering the background Scene, a ScrollHero for the search interface, and a main content area with results sections.

On mobile though, using a smaller transition factor than 100vh would leave a gap before results appear once the transition finishes, so it's cleaner to just use 100vh uniformly for both transition distance and spacer height, sacrificing the mobile speed tweak for consistency.

Also I need to handle the empty-query case, since with nothing below the spacer the page feels too short and empty. I'll give the main content area a minimum height so there's always something to scroll into, keeping the layout from feeling abrupt when no results are shown yet.

The query stays put when scrolling back to top, so users can edit and resubmit easily. I want to preserve the original entrance animations on the ScrollHero elements since it mounts once and won't replay them on re-renders—adding those fade classes to the wordmark and other components now.

But then I realize the CSS keyframe animation sets a final transform value that could directly conflict with the JS-driven scroll transforms applied via inline styles, since both are competing for the same transform property on the element.

Confirming that passing the className prop correctly applies the fade-up class and delay to the Wordmark's span. Now I'm planning the simplified Results.tsx structure, stripping out the search bar and mode pills so it only renders the results meta, list, and bottom wordmark.

I'm renaming the exported component to ResultsContent and defining it to take query and mode props, looking up the mode label from MODES, then rendering the mock results within a centered container.

Finishing the results list with title links and snippets, then closing with a footer wordmark and end-of-results label.

Now I'm planning to rewrite Scene.tsx more substantially, adding refs for the sphere container and halo, computing a raw transform value in the tick function, and removing the inline transform so JavaScript handles positioning directly, while keeping the background parallax, light rays, and sphere/halo intact.

I still need the drifting clouds, floating particles, reflection shimmer, and readability wash to remain functional. For index.css, I'm removing the scroll-behavior: smooth rule since scrolling will be JS-controlled, and deciding against adding will-change broadly since it could hurt performance more than help.

Time to start writing the actual code changes.
