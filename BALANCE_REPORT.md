# Balance Report — June 2026

## Tournament Results

Round-robin across all 6 AI strategy profiles, 100 games per matchup, random grid.

```
================================================================================
  ROUND-ROBIN TOURNAMENT RESULTS
  100 games per matchup, grid: random
================================================================================

  OVERALL RANKINGS:
  #    Profile              Avg Win Rate
  --------------------------------------
  1    Tank                        52.6%
  2    Economy                     50.8%
  3    GlassCannon                 50.0%
  4    TowerFortress               49.2%
  5    Balanced                    49.0%
  6    Rush                        48.2%

  WIN RATE MATRIX (row vs column):
                      Balanced        Rush     Economy TowerFortre GlassCannon        Tank
  ----------------------------------------------------------------------------------------
  Balanced                   -         48%         57%         52%         43%         45%
  Rush                     52%           -         48%         51%         45%         45%
  Economy                  43%         52%           -         49%         60%         50%
  TowerFortress            48%         49%         51%           -         57%         41%
  GlassCannon              57%         55%         40%         43%           -         55%
  Tank                     55%         55%         49%         59%         45%           -

  Spread: 4.4 percentage points (48.2% – 52.6%)
```

---

## Strategy Profiles

### Balanced (49.0%)
**Identity**: Consistent all-rounder that wins through mid-game efficiency.  
**Weights**: attack:1.8, speed:1.6, spawnRate:2.0, health:1.5, defense:0.8  
**Counters**: Economy (57%), TowerFortress (52%)  
**Loses to**: GlassCannon (43%), Tank (45%), Rush (48%)

### Rush (48.2%)
**Identity**: Fastest spawn rate + speed; overwhelms before opponents scale.  
**Weights**: spawnRate:3.0, speed:1.9, attack:1.8; no towers, no territory income  
**Counters**: Balanced (52%), TowerFortress (51%)  
**Loses to**: GlassCannon (45%), Tank (45%), Economy (48%)

### Economy (50.8%)
**Identity**: Interest snowball into late-game military dominance.  
**Weights**: interestRate:2.0, attack:2.0, spawnRate:2.0, maxParticles:1.5  
**Counters**: GlassCannon (60%), Rush (52%)  
**Loses to**: Balanced (43%), TowerFortress (49%), Tank (49%)

### TowerFortress (49.2%)
**Identity**: Tower network + durable army wins by sustained attrition.  
**Weights**: health:2.0, defense:2.0, interestRate:1.5, attack:1.8; towerPriority:high  
**Counters**: GlassCannon (57%), Economy (51%)  
**Loses to**: Tank (41%), Balanced (48%), Rush (49%)

### GlassCannon (50.0%)
**Identity**: Devastating burst damage — kills fast or dies trying.  
**Weights**: attack:1.6, speed:1.6, spawnRate:1.5; no towers, no territory income  
**Counters**: Balanced (57%), Rush (55%), Tank (55%)  
**Loses to**: Economy (40%), TowerFortress (43%)

### Tank (52.6%)
**Identity**: Durable high-defense army wins by attrition — HP+defense negates scaling attacks.  
**Weights**: health:2.5, attack:2.0, spawnRate:2.2, defense:1.7, maxParticles:1.5, interestRate:0.8  
**Counters**: TowerFortress (59%), Balanced (55%), Rush (55%)  
**Loses to**: GlassCannon (45%), Economy (49%)

---

## Counter-Play Web

No single dominant strategy. The web has multiple overlapping triangles:

```
GlassCannon ──(57%)──► Balanced ──(57%)──► Economy ──(60%)──► GlassCannon
     │                                                               ▲
     └──(55%)──► Rush ──(51%)──► TowerFortress ──(57%)──► GlassCannon
     │                                │
     └──(55%)──► Tank ──(59%)──►──────┘
                  │
                  └──(55%)──► Balanced, Rush
```

Key triangles:
- **GlassCannon → Tank → TowerFortress → GlassCannon** (speed beats armor; armor beats towers; towers beat glass)
- **Economy → GlassCannon → Balanced → Economy** (scale beats burst; burst beats balanced; balanced beats scale)

---

## Verification

- All 613 tests pass (`npm run test:run`)
- Production build succeeds (`npm run build`)
