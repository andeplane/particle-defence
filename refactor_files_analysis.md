# Refactor Files Analysis

Analysis of all TypeScript files in `src/` against the coding patterns in [`.cursor/rules/coding-patterns.mdc`](.cursor/rules/coding-patterns.mdc):

1. **Dependency Injection** (React context or factory functions with partial overrides)
2. **Interface-Based Services**
3. **ViewModel / separation of concerns**

---

## src/config.ts

**Priority:** None

**Pattern compliance:** Configuration constants are intentionally centralized. No DI or interfaces needed for a static config object.

**Findings:**
- Single source of truth for game parameters as intended
- `getUpgradeCost` is a pure function with no hidden dependencies

**Refactoring suggestions:** None.

---

## src/main.ts

**Priority:** None

**Pattern compliance:** Entry point that bootstraps the Phaser game. Minimal logic, acceptable to hard-code scene registration.

**Findings:**
- Directly imports and instantiates scenes; no DI
- For a small game bootstrap, this is acceptable

**Refactoring suggestions:** None. If the project grows, consider a scene registry with factory injection.

---

## src/ai.ts

**Priority:** High

**Pattern compliance:** Violates DI and interface patterns.

**Findings:**
- Tightly coupled to concrete `GameScene` class; `update(delta, gameScene: GameScene)` receives the full scene
- Directly accesses `gameScene.players`, `gameScene.particles`, `gameScene.gameTimeMs`, `gameScene.gameOver`, `gameScene.launchNuke()`
- Hard-codes `CONFIG.BASE_HP`, `CONFIG.NUCLEAR_*` via imports
- Untestable without spinning up a full Phaser scene

**Refactoring suggestions:**
- Introduce `AIGameState` (or similar) interface with only the data/methods the AI needs: `players`, `particles`, `gameTimeMs`, `gameOver`, `launchNuke(playerId)`
- Use factory with partial overrides: `new AIController(dependencies)` where dependencies include `getGameState: () => AIGameState`
- Inject `CONFIG` or a narrow config interface for testability

---

## src/player.ts

**Priority:** Medium

**Pattern compliance:** No interface; hard-coded CONFIG; repeated switch logic.

**Findings:**
- No `Player` interface; callers depend on concrete class
- Direct `CONFIG` import for `BASE_HP`, `STARTING_GOLD`, `PARTICLE_*`, `MAX_PARTICLES_*`, `NUCLEAR_*`, `UPGRADE_COSTS`
- `getUpgradeLevel` and `buyUpgrade` use large switch statements; could use a map or strategy

**Refactoring suggestions:**
- Define `Player` interface and have `Player` class implement it
- Consider factory: `createPlayer(id, configOverrides?)` for testability
- Replace switch-based upgrade handling with a map: `upgradeLevels: Record<UpgradeType, number>` and `applyUpgrade(type)`

---

## src/collision.ts

**Priority:** Medium

**Pattern compliance:** Takes `GameContext` (good) but hard-codes `CONFIG.KILL_REWARD`.

**Findings:**
- `resolveCollisions(context: GameContext)` uses context for particles, spatial hash, players
- Directly imports `CONFIG.KILL_REWARD`; not injectable for tests
- Pure function structure is good; only config is hard-coded

**Refactoring suggestions:**
- Add `killReward` to `GameContext` or pass as optional param with default from CONFIG
- Alternatively: `resolveCollisions(context, { killReward: CONFIG.KILL_REWARD })` with dependency override for tests

---

## src/spatial-hash.ts

**Priority:** Medium

**Pattern compliance:** No interface; hard-codes CONFIG in constructor.

**Findings:**
- No `SpatialHash` interface; callers depend on concrete class
- Constructor reads `CONFIG.SPATIAL_CELL_SIZE` and `CONFIG.GAME_WIDTH` directly
- Untestable with different grid sizes without modifying CONFIG

**Refactoring suggestions:**
- Define `SpatialHash` interface with `clear()`, `insert(p)`, `getNearby(p)`
- Constructor: `new SpatialHash({ cellSize, gameWidth }?)` with defaults from CONFIG
- Enables testing with custom dimensions

---

## src/grid/Grid.ts

**Priority:** Medium

**Pattern compliance:** No interface; hard-codes CONFIG for computed properties.

**Findings:**
- No `Grid` interface; `cellW` and `cellH` getters use `CONFIG.GAME_WIDTH` and `CONFIG.GAME_HEIGHT`
- `isInBase` also uses CONFIG
- Constructor takes explicit params (good); only getters are config-coupled

**Refactoring suggestions:**
- Define `Grid` interface: `isWall`, `isInBase`, `hasPath`, `cells`, `cellW`, `cellH`, etc.
- Pass `gameWidth` and `gameHeight` into constructor (or a config object) instead of reading from CONFIG in getters
- Keeps Grid reusable for different resolutions

---

## src/grid/generators/ensurePath.ts

**Priority:** None

**Pattern compliance:** Pure function with no hidden dependencies.

**Findings:**
- `ensurePathExists(cells, cols, rows, baseWidth)` takes all inputs as parameters
- No CONFIG import, no side effects beyond mutating `cells`
- Easily testable

**Refactoring suggestions:** None.

---

## src/grid/generators/maze.ts

**Priority:** Low

**Pattern compliance:** Hard-codes CONFIG; no DI for grid factory.

**Findings:**
- Imports `CONFIG` for `MAZE_COLS`, `MAZE_ROWS`, `BASE_WIDTH_CELLS`
- Directly constructs `new Grid(...)`; no interface
- `generateMazeGrid()` has no dependency overrides for testing different dimensions

**Refactoring suggestions:**
- Add optional params: `generateMazeGrid({ cols, rows, baseWidth }?)` with defaults from CONFIG
- Low priority since grid generation is already parameterized via CONFIG

---

## src/grid/generators/random.ts

**Priority:** Low

**Pattern compliance:** Same as maze.ts; hard-codes CONFIG.

**Findings:**
- Imports `CONFIG` for `MAZE_COLS`, `MAZE_ROWS`, `PERCOLATION_THRESHOLD`, `BASE_WIDTH_CELLS`
- `generateRandomGrid()` has no dependency overrides
- Fallback threshold `0.7` is magic number; could come from config

**Refactoring suggestions:**
- Add optional params for dimensions and threshold
- Extract fallback threshold to CONFIG or pass as param

---

## src/grid/generators/index.ts

**Priority:** None

**Pattern compliance:** Simple switch/dispatch; no hidden dependencies.

**Findings:**
- `generateGrid(type)` delegates to specific generators
- Clean, minimal logic

**Refactoring suggestions:** None.

---

## src/grid/index.ts

**Priority:** None

**Pattern compliance:** Re-exports only; no logic.

**Findings:** Barrel file with no refactoring needs.

**Refactoring suggestions:** None.

---

## src/particles/AbstractParticle.ts

**Priority:** High

**Pattern compliance:** Module-level mutable state; hard-coded CONFIG; no interface.

**Findings:**
- Module-level `let nextId = 0` is mutable global state; breaks test isolation and makes parallel tests unsafe
- Direct CONFIG import for `GAME_WIDTH`, `MAZE_COLS`, `BASE_WIDTH_CELLS`, `PARTICLE_*`, `STUCK_THRESHOLD_*`
- No `Particle` or `AbstractParticle` interface for polymorphism
- `preventBaseReturn` uses `CONFIG.GAME_WIDTH / CONFIG.MAZE_COLS`; couples to grid dimensions

**Refactoring suggestions:**
- Inject ID generator: `constructor(..., idGenerator?: () => number)` with default `() => nextId++`
- Or pass `IdGenerator` in `GameContext` / factory
- Define `Particle` interface for `update`, `onCollide`, `onDeath`, `takeDamage`, etc.
- Consider passing bounds/config via `GameContext` or constructor for testability

---

## src/particles/BasicParticle.ts

**Priority:** None

**Pattern compliance:** Minimal subclass; follows inheritance pattern.

**Findings:**
- Extends `AbstractParticle` and only sets `typeName`
- No additional dependencies or logic

**Refactoring suggestions:** None.

---

## src/particles/GameContext.ts

**Priority:** None

**Pattern compliance:** Interface already defined; clean contract.

**Findings:**
- `GameContext` interface defines the contract for particle/collision systems
- No implementation; pure type definition

**Refactoring suggestions:** None. Consider adding `killReward` if collision refactor is done.

---

## src/particles/index.ts

**Priority:** None

**Pattern compliance:** Re-exports only.

**Findings:** Barrel file with no refactoring needs.

**Refactoring suggestions:** None.

---

## src/scenes/GameScene.ts

**Priority:** High

**Pattern compliance:** God class; no DI; mixed concerns; hard-coded dependencies.

**Findings:**
- **God class:** Game loop, rendering, entity management, spawning, nuke logic, win condition, stuck detection, and cleanup all in one scene
- **Hard-coded dependencies:** `new Player(0)`, `new Player(1)`, `new SpatialHash()`, `new AIController()`, `new BasicParticle(...)`, `generateGrid(gridType)` — none injectable
- **No interfaces:** Depends on concrete `Player`, `AbstractParticle`, `Grid`, `SpatialHash`
- **Mixed concerns:** Rendering (maze, bases, textures, explosions) mixed with game logic (spawn, collision, base damage, win check)
- **Direct CONFIG usage:** Throughout for dimensions, colors, particle params

**Refactoring suggestions:**
- Extract **game logic** into a `GameEngine` or `GameState` service: spawn, collision, base damage, win condition, stuck detection
- Inject factories: `playerFactory`, `particleFactory`, `gridFactory`, `spatialHashFactory`, `aiControllerFactory`
- GameScene becomes a thin Phaser scene that delegates to the engine and renders
- Consider ViewModel-like separation: `GameViewModel` holds state and commands; scene only renders and forwards input

---

## src/scenes/UIScene.ts

**Priority:** High

**Pattern compliance:** No ViewModel; directly accesses GameScene internals; mixed presentation and logic.

**Findings:**
- **No ViewModel:** `update()` directly reads `this.gameScene.players`, `this.gameScene.particles`, `this.gameScene.gameTimeMs`, `this.gameScene.gameOver`
- **Tight coupling:** UIScene must know GameScene’s structure; any change to GameScene can break UI
- **Mixed concerns:** Layout, keyboard handling, upgrade/nuke logic, and animation all in one class
- **Hard-coded CONFIG:** UI dimensions, colors, fonts

**Refactoring suggestions:**
- Introduce `UIGameViewModel` (or similar) with: `players`, `particles`, `gameTimeMs`, `gameOver`, `purchaseUpgrade()`, `launchNuke()`
- GameScene provides this view model; UIScene consumes it
- Enables testing UI logic with a mock view model
- Extract layout constants to CONFIG or a shared UI config

---

## src/scenes/MenuScene.ts

**Priority:** Low

**Pattern compliance:** Duplicate button logic; no DI.

**Findings:**
- `createButton` is duplicated in `MapSelectScene.ts`
- Direct CONFIG import for layout and colors
- Simple scene; refactoring impact is low

**Refactoring suggestions:**
- Extract shared `createMenuButton` to a utility or base class used by MenuScene and MapSelectScene
- Reduces duplication and keeps button styling consistent

---

## src/scenes/MapSelectScene.ts

**Priority:** Low

**Pattern compliance:** Duplicate button logic; no DI.

**Findings:**
- Same `createButton` implementation as MenuScene (copy-paste)
- Direct CONFIG import
- Simple scene; low impact

**Refactoring suggestions:**
- Share `createMenuButton` with MenuScene (see MenuScene entry)

---

## Summary Table

| File | Priority | Main Issues |
|------|----------|-------------|
| `src/config.ts` | None | — |
| `src/main.ts` | None | — |
| `src/ai.ts` | High | Coupled to GameScene, no interface, untestable |
| `src/player.ts` | Medium | No interface, CONFIG hard-coded, switch duplication |
| `src/collision.ts` | Medium | CONFIG.KILL_REWARD hard-coded |
| `src/spatial-hash.ts` | Medium | No interface, CONFIG in constructor |
| `src/grid/Grid.ts` | Medium | No interface, CONFIG in getters |
| `src/grid/generators/ensurePath.ts` | None | — |
| `src/grid/generators/maze.ts` | Low | CONFIG hard-coded |
| `src/grid/generators/random.ts` | Low | CONFIG hard-coded |
| `src/grid/generators/index.ts` | None | — |
| `src/grid/index.ts` | None | — |
| `src/particles/AbstractParticle.ts` | High | Module-level nextId, CONFIG, no interface |
| `src/particles/BasicParticle.ts` | None | — |
| `src/particles/GameContext.ts` | None | — |
| `src/particles/index.ts` | None | — |
| `src/scenes/GameScene.ts` | High | God class, no DI, mixed concerns |
| `src/scenes/UIScene.ts` | High | No ViewModel, tight GameScene coupling |
| `src/scenes/MenuScene.ts` | Low | Duplicate createButton |
| `src/scenes/MapSelectScene.ts` | Low | Duplicate createButton |
