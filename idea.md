# Game Ideas

## Particle Spawner Tower

A tower that spawns particles at its location instead of from the base.

- **Mechanics**: Stationary tower (like Laser/Slow towers) that periodically spawns particles at its position
- **Placement**: Same carrier + PLACE flow as other towers
- **Upgrades**: TBD (e.g. spawn rate, particle stats, range from tower)

---

## Wall Particle

A carrier-style particle (like tower carriers) that, when triggered, converts all cells within a radius into temporary HP walls.

- **Mechanics**: Sent out like tower particles; player triggers placement (e.g. PLACE key) to convert cells in radius to walls with HP
- **Upgrades**:
  - **Radius** – size of the wall zone
  - **HP** – hit points of each wall cell
- **Integration**: Uses existing `tempWallHP` cell effect type; walls block enemy particles and can be destroyed by damage

---

## Max Towers Upgrade

Add a new upgrade that increases the maximum number of towers a player can have (currently capped at 5 via `TOWER_MAX_PER_PLAYER`).
