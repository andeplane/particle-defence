# Strategy Guide

A breakdown of the six core strategies, their upgrade priorities, timelines, and matchup considerations.

## Game Fundamentals

Before diving into strategies, understand the key mechanics that shape decision-making:

- **Lanchester's Square Law**: Army power scales as N² × attack × effectiveHP. Doubling your army size quadruples your combat power. This makes spawn rate and max particles extremely valuable.
- **Anti-tank HP scaling**: Attacking a high-HP target deals bonus damage proportional to the target's max health. This prevents pure health-stacking from being dominant.
- **Speed combat bonus**: Faster particles deal bonus damage to slower ones. Speed isn't just about reaching the enemy base — it's a combat stat.
- **Defense reduces HP scaling**: The defense upgrade partially negates the anti-tank HP scaling penalty, making defense a direct counter to the anti-tank mechanic.
- **Global defense**: Defense provides a small damage reduction everywhere (not just in owned territory), giving defensive builds survivability when pushing.
- **Cell ownership**: Controlling territory grants a defense bonus to your particles standing in owned cells and slows enemy particles passing through.

### Economy Basics

| Resource | Source | Notes |
|----------|--------|-------|
| Starting gold | 25g | Enough for ~3-5 early upgrades |
| Kill reward | 1g per kill | Primary income source |
| Nuke kills | 0.25g per kill | Reduced reward |
| Interest | 0.25% per level, every 30s | Caps at 5% (20 levels) |

Upgrade costs scale exponentially: `baseCost × 1.3^level`. Early upgrades are cheap; late ones are expensive.

## The Six Strategies

---

### 1. Balanced

**Philosophy**: Jack of all trades. Invests evenly across offense and production, adapting to what the opponent does.

**Upgrade Priority**: Attack ≈ Spawn Rate > Speed > Health > Max Particles > Defense > Radius > Interest

**Timeline**:
| Phase | Time | Focus |
|-------|------|-------|
| Early (0-60s) | Spawn rate + attack | Get particles flowing and hitting hard |
| Mid (60-180s) | Speed + health + max particles | Round out the army |
| Late (180s+) | Tower research + construction | Add static defenses, continue upgrading |

**Strengths**: No hard counters. Adapts well to any opponent. Consistent performance.

**Weaknesses**: Doesn't excel in any specific area. Can be outpaced by specialists in their domain.

**Tower Usage**: Standard. Researches after 2 minutes, builds when gold allows. Alternates laser and slow towers.

---

### 2. Rush

**Philosophy**: Overwhelm early with sheer numbers and speed. Win before the opponent scales.

**Upgrade Priority**: Spawn Rate >>> Speed > Attack >> Health (minimal)

**Timeline**:
| Phase | Time | Focus |
|-------|------|-------|
| Early (0-30s) | Spawn rate × 3-4 levels | Flood the map immediately |
| Mid (30-90s) | Speed + attack | Make the swarm lethal and fast |
| Late (90s+) | Continue attack + speed | No pivot to economy or towers |

**Strengths**: Enormous early pressure. Speed bonus makes the swarm deal extra damage. Can end games before opponents establish infrastructure.

**Weaknesses**: Falls off if the game goes long. No towers means no static defense. Low health particles die quickly to area damage and upgraded enemies.

**Tower Usage**: Disabled. All gold goes into particle upgrades.

**Key Mechanic**: The speed combat bonus is critical — a fast swarm deals significantly more damage to slower, tankier particles.

---

### 3. Economy

**Philosophy**: Invest in interest early, scale into a late-game powerhouse with superior gold income.

**Upgrade Priority**: Interest Rate ≈ Attack ≈ Spawn Rate > Speed > Max Particles > Health

**Timeline**:
| Phase | Time | Focus |
|-------|------|-------|
| Early (0-60s) | Interest rate (2-4 levels) + spawn rate | Build the gold engine |
| Mid (60-180s) | Attack + speed + max particles | Spend the interest income on combat stats |
| Late (180s+) | All upgrades + towers | Outspend everyone with compound interest |

**Strengths**: Dominant late game. Interest compounds, giving a growing gold advantage. Can afford more total upgrades than any other strategy.

**Weaknesses**: Vulnerable in the first 2-3 minutes while building the economy engine. Interest only pays off if you survive long enough and maintain a gold bank.

**Tower Usage**: Standard. Can afford towers earlier than most thanks to interest income.

**Break-even Math**: At 3 levels of interest (0.75% per 30s) with 100g banked, you earn ~0.75g per interval. The investment pays for itself after roughly 10-15 interest ticks (5-7.5 minutes). Front-loading interest is a gamble on game length.

---

### 4. Tower Fortress

**Philosophy**: Combine strong particle combat with aggressive tower deployment. Control territory with static defenses while particles push forward.

**Upgrade Priority**: Attack > Defense > Speed > Spawn Rate > Interest > Health > Max Particles

**Timeline**:
| Phase | Time | Focus |
|-------|------|-------|
| Early (0-60s) | Attack + spawn rate | Establish a particle presence |
| Mid (60-120s) | Research laser tower (200g) | Unlock towers ASAP (high priority: researches at 60s) |
| Mid (120-180s) | Build laser (500g) + defense | Place first tower, start defense investment |
| Late (180s+) | Alternate laser/slow towers + upgrades | Fill tower cap, upgrade towers for range/DPS |

**Strengths**: Towers create zones of denial. Defense investment synergizes with cell ownership for strong territory control. Combined arms (particles + towers) is hard to crack.

**Weaknesses**: Expensive. Tower research (200g) + construction (500g) delays particle upgrades significantly. Towers can be destroyed by enemy particles or nukes.

**Tower Details**:
| Tower | Base DPS | Range | HP | Construction |
|-------|---------|-------|-----|-------------|
| Laser | 12.5/s (5 dmg × 2.5/s) | 150 | 50 | 500g |
| Slow | 40% slow in range | 140 | 40 | 500g |

Towers are upgraded by spending gold (200g base, ×1.4 per level). Each level improves damage/slow, range, and HP.

**Key Mechanic**: `towerPriority: 'high'` makes the AI research at 60s instead of 120s and build with less gold reserve (1.2× cost vs 1.5×).

---

### 5. Glass Cannon

**Philosophy**: Maximize damage output. Kill enemies before they can fight back.

**Upgrade Priority**: Attack >>> Speed >> Spawn Rate >> Health (minimal)

**Timeline**:
| Phase | Time | Focus |
|-------|------|-------|
| Early (0-30s) | Attack × 3-4 levels | Hit as hard as possible immediately |
| Mid (30-120s) | Speed + more attack + spawn rate | Fast, lethal particles |
| Late (120s+) | Continue attack + speed | Never stop investing in offense |

**Strengths**: Highest single-particle damage. Speed bonus amplifies already-high attack. Shreds through high-HP targets thanks to raw attack power. Anti-tank HP scaling barely matters when you kill in 1-2 hits.

**Weaknesses**: Glass-thin particles die fast. No defense, no towers. Vulnerable to nukes (low HP means rebuilding is costly in particle terms). Struggles against well-defended territory with cell ownership bonuses.

**Tower Usage**: Disabled. Pure particle offense.

**Key Difference from Rush**: Rush overwhelms with quantity (spawn rate focus). Glass Cannon overwhelms with quality (attack focus). Rush has more particles; Glass Cannon has deadlier ones.

---

### 6. Tank

**Philosophy**: Build an unstoppable wall of durable particles. Absorb damage, hold territory, and grind the opponent down.

**Upgrade Priority**: Health ≈ Defense >>> Attack > Spawn Rate > Max Particles > Speed

**Timeline**:
| Phase | Time | Focus |
|-------|------|-------|
| Early (0-60s) | Health + spawn rate | Get durable particles onto the field |
| Mid (60-180s) | Defense + attack + more health | Territory control + global defense |
| Late (180s+) | Max particles + towers | Fill the map with an unkillable army |

**Strengths**: Extremely durable army. Defense investment counters the anti-tank HP scaling (via `DEFENSE_HP_SCALING_REDUCTION`). Global defense means even particles pushing into enemy territory have damage reduction. Cell ownership bonus stacks with defense for strong territory holds.

**Weaknesses**: Slow particles. The speed combat bonus means faster enemies deal extra damage. Low DPS means games tend to go long. Vulnerable to speed-focused builds that can kite and chip away.

**Key Mechanic**: Defense has a dual purpose for Tank:
1. Direct damage reduction (up to 30% in owned cells)
2. Reduces the anti-tank HP scaling penalty (the factor that would otherwise punish high-HP builds)
3. Global defense (up to 18%) provides protection even in enemy territory

This makes defense the key upgrade that enables the Tank strategy to exist despite anti-tank mechanics.

---

## Matchup Dynamics

The game is designed so no single strategy dominates. Here are the general matchup tendencies:

| | Balanced | Rush | Economy | TowerFortress | GlassCannon | Tank |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Balanced** | — | Slight edge | Even | Even | Even | Favored |
| **Rush** | Slight dis. | — | Favored early | Even | Even | Favored |
| **Economy** | Even | Unfav. early | — | Even | Even | Favored |
| **TowerFortress** | Even | Even | Even | — | Even | Favored |
| **GlassCannon** | Even | Even | Even | Even | — | Favored |
| **Tank** | Unfavored | Unfavored | Unfavored | Unfavored | Unfavored | — |

**Key observations**:
- The top 5 strategies are tightly packed (~52-58% win rates against the field)
- Tank is the weakest overall (~27%) due to anti-tank mechanics, but can hold territory effectively
- No single strategy hard-counters another (no 90%+ matchups)
- Rush and Glass Cannon trade early power for late vulnerability
- Economy needs to survive the early game to unlock its potential
- Tower Fortress provides the most consistent mid-late game control

## Nuclear Weapons

Available after 5 minutes, then on a 5-minute cooldown. Instantly kills all enemy particles.

**When to nuke**:
- You're losing badly (below 60% HP while enemy is above 80%)
- Enemy has 2× more particles than you
- Desperation (below 30% HP)
- High value (enemy has 400+ particles)

**Nuke interaction with strategies**:
- **Rush/GlassCannon**: Most vulnerable. Low-HP swarms are expensive to rebuild.
- **Tank**: Least affected in terms of gold lost (high health = more gold invested per particle, but slow rebuild).
- **TowerFortress**: Nukes kill towers too. Devastating against tower-heavy builds.
- **Economy**: Can rebuild fastest thanks to gold interest income.

## Upgrade Reference

| Upgrade | Base Cost | Per Level | Max | Notes |
|---------|-----------|-----------|-----|-------|
| Health | 5g | +0.8 HP | ∞ | Diminishing returns vs attack scaling |
| Attack | 5g | +1.2 dmg | ∞ | Scales faster than health (1.2 vs 0.8) |
| Radius | 3g | +1 | ∞ | Increases collision range; low priority |
| Spawn Rate | 8g | −10ms interval | 40ms min | Huge early; worthless near cap |
| Speed | 7g | +20 speed | ∞ | Also a combat stat (speed bonus) |
| Max Particles | 10g | +50 cap | ∞ | Only matters when hitting population cap |
| Defense | 15g | +2% cell / +1.8% global | 30% / 18% | Expensive but enables Tank builds |
| Interest Rate | 10g | +0.25% per 30s | 5% (20 lvls) | Long-term investment |

Cost at level N: `baseCost × 1.3^N` (e.g., Health at level 5 costs 5 × 1.3⁵ ≈ 18g)

## Tower Reference

| | Laser Tower | Slow Tower |
|---|---|---|
| Research cost | 200g | 200g |
| Construction cost | 500g | 500g |
| Base HP | 50 | 40 |
| Base stat | 5 dmg, 2.5 atk/s = 12.5 DPS | 40% slow |
| Base range | 150 | 140 |
| HP per level | +10 | +8 |
| Stat per level | +2 dmg, +0.4 atk/s | +7% slow (cap 90%) |
| Range per level | +15 | +20 |
| Upgrade cost | 200g × 1.4^level | 200g × 1.4^level |
| Max per player | 5 (shared across types) | 5 (shared across types) |

Towers take 50% reduced damage from particle collisions. They can be destroyed and are killed by nukes.
