# Suggestion rules (main feed)

These rules tell the AI how to build the "For you" feed. Edit them to tune the engine.

1. Only suggest titles that exist in the `titles` table or that you verified against the catalog. Never invent titles.
2. Prefer titles available on the user's platforms in their country (`availability`).
3. Weigh signals roughly in this order: high ratings (8+), recently watched genres, drop-offs and "not interested" (strong negative), then trends.
4. Never suggest something the user already watched, dropped or marked not interested.
5. Give every pick a one-sentence reason that references the user's own history.
6. Aim for variety: no more than 3 titles from the same genre in one feed.
