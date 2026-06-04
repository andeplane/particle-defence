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

## Bomb Particle

A fragile, high-impact particle that detonates on contact or death.

- **Mechanics**: Moves like a normal particle, but deals burst damage when it reaches enemies, towers, or the enemy base
- **Tradeoff**: Lower health and/or attack while alive, with most value concentrated in the explosion
- **Upgrades**: TBD (e.g. blast radius, explosion damage, fuse behavior)

---

## Splitting Particle

A particle that splits into smaller, weaker particles when it dies.

- **Mechanics**: On death, spawns multiple child particles at its location
- **Scaling**: Potentially supports multiple split levels, with each generation becoming smaller and weaker
- **Tradeoff**: Strong against single-target damage, weaker against AoE and splash effects
- **Upgrades**: TBD (e.g. number of children, split depth, child stat retention)

---

## AoE Death Particle

A particle that damages nearby enemies when it dies.

- **Mechanics**: On death, applies area damage to enemy particles and towers within a radius
- **Tradeoff**: Rewards good timing and clustered fights, but may be inefficient against spread-out enemies
- **Upgrades**: TBD (e.g. death radius, explosion damage, falloff)

---

## Traitor Particles

Particles that appear behind enemy lines and attack the enemy from within their side of the map.

- **Mechanics**: Spawn on the enemy side instead of from the player's own base
- **Targeting**: Damage enemy particles, towers, and/or the enemy base like friendly attackers
- **Tradeoff**: Potentially expensive or limited, since they bypass normal frontline pressure
- **Upgrades**: TBD (e.g. spawn count, traitor stats, spawn depth, cooldown)

---

## Reflective Mirror Column

A map feature or buildable effect where a full column, or part of a column, acts like a half-reflective mirror.

- **Mechanics**: Particles crossing the mirror have a chance to reflect as if they hit a wall
- **Directionality**: Each player upgrades reflection strength in their own defensive direction; for example, if Red has 20% reflection, particles moving toward Red's side have a 20% chance to reflect
- **Research**: Requires a new mirror/reflection research unlock before upgrades become available
- **Upgrades**: Increase the reflection chance for particles moving toward that player's side
- **Placement/Shape**: Could affect a whole column, one third of a column, or selected mirror segments

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
