## Direction contract

TARGET: src/app/page.tsx (components in src/app/_home/)

MODE: Operate, with a light Persuade header. The visitor comes to see what is trading and how close each launch is to graduation.

THESIS: A live launch board. Every launch is drawn as the instrument it is: a bonding curve rising toward a graduation target. The home page previews the `/launch/[slug]` stage instead of describing it; the explanation lives on `/guide`.

OWN-WORLD: The shared graphite/lime system on the neutral gray page ground (#ececec). One compact ink panel carries the title and the graduation board; white cards carry launches and the rail. Engraved 6px hairlines are the texture. Lime marks only progress (as a fade that builds into the current point) and the primary action; orange marks only graduation and outdated data. No banners on cards.

STORY: See which open launches are closest to graduation, browse launches by status, glance at the rail (distribution, ending soon, your launches), then open a launch or create one.

FIRST VIEWPORT: Compact ink panel (one-line title, one sentence, How it works, Create a launch) with the graduation board, the start of the launch grid, and the rail on `xl`.

LAYOUT: Full content width up to 1680px; main column plus a sticky 19rem rail (21rem from 2xl) from xl. Below xl the rail follows the launches.

DATA: First page (20) of the public launch list, shared with /launches page one. Counts that cover only that page say so. Your launches uses the owner-filtered list. No sample data.

MOTION: One entrance. Board lanes and card curves wipe in from the left (1100ms ease-out-expo), then the current points fade in. Reduced motion removes it. No continuous animation.

STYLING: Tailwind utilities only; no CSS module for this surface.
