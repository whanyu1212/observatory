# Gem replay excerpt

`gem-replay.json` contains recorded positions from the user's Gem repository:
`examples/ti14_sample.json`, match 8461735141 (TI14 Grand Finals, game 3).
It intentionally omits account identifiers, chat, and unrelated match data.

For each five-second step after `game_start_tick`, take the latest recorded
position at or before that step; samples older than six seconds are null.
Ticks run at 30 per second. Coordinates map to a 1000-square view using Gem's
report bounds: X 7563–25900, Y 7800–25600, with screen Y reversed. Coordinates
are rounded to one decimal. Paths connect recorded samples, not simulated movement.

`src/assets/gem-map.jpg` is the existing map asset from
`gem/assets/maps/Game_map_7.40.jpg`, using the same projection as Gem's report.
Astro optimizes it for display. Dota 2 map artwork belongs to Valve.
