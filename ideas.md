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

---

## Armageddon

A special ability that rains down falling meteors/projectiles across the enemy half of the map, dealing area damage to enemy particles caught in the blast zones.

- **Mechanics**: When activated, multiple meteors fall at random positions on the enemy side, each dealing AoE damage in a radius
- **Cooldown**: Separate cooldown from Nuke (TBD)
- **Cost**: TBD

---

## Double Attack Power

A temporary buff that doubles the attack power of all friendly particles for a short duration.

- **Mechanics**: All own particles deal 2x damage for the duration
- **Base Duration**: 5 seconds
- **Upgrades**:
  - **Duration** – increases how long the buff lasts
- **Cooldown**: TBD
- **Cost**: TBD

---

## Invulnerability (100% Defence)

A temporary buff that grants all friendly particles complete damage immunity for a short duration.

- **Mechanics**: All own particles take 0 damage for the duration
- **Base Duration**: 5 seconds
- **Upgrades**:
  - **Duration** – increases how long the buff lasts
- **Cooldown**: TBD
- **Cost**: TBD
