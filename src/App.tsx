import { useEffect, useState } from 'react';
import './App.css';

type Tile = number | null;
type Grid = Tile[][];

type Direction = 'up' | 'down' | 'left' | 'right';

interface GameState {
  map: Grid;
  score: number;
  finished: boolean;
}

const ROWS = 4;
const COLS = 4;
const TARGET_TILE = 128;
const STORAGE_KEY = 'hw-2048-react-state';

const rotateMapDeg: Record<Direction, 0 | 90 | 180 | 270> = {
  up: 90,
  right: 180,
  down: 270,
  left: 0,
};

const revertMapDeg: Record<Direction, 0 | 90 | 180 | 270> = {
  up: 270,
  right: 180,
  down: 90,
  left: 0,
};

function App() {
  const [game, setGame] = useState<GameState>(() => {
    const saved = load();
    if (saved) return saved;

    const map = emptyMap(ROWS, COLS);
    spawn(map);
    spawn(map);
    return { map, score: 0, finished: false };
  });

  // 키보드 입력 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setGame((prev) => {
        if (prev.finished) return prev;

        const dir = keyToDirection(e.key);
        if (!dir) return prev;

        e.preventDefault();

        const { result, isMoved, gained } = moveMapIn2048Rule(prev.map, dir);
        if (!isMoved) return prev;

        // 결과 보드 복사 후 새로운 타일 생성
        const newMap: Grid = result.map((row) => [...row]);
        spawn(newMap);

        const reachedTarget = reached(newMap, TARGET_TILE);

        const next: GameState = {
          map: newMap,
          score: prev.score + gained,
          finished: reachedTarget,
        };

        save(next);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNewGame = () => {
    const map = emptyMap(ROWS, COLS);
    spawn(map);
    spawn(map);
    const next: GameState = { map, score: 0, finished: false };
    setGame(next);
    save(next);
  };

  return (
    <main className="wrap">
      <header className="topbar">
        <h1>2048</h1>
        <div className="controls">
          <div className="score">
            <span>점수</span>
            <strong>{game.score}</strong>
          </div>
          <button className="btn" type="button" onClick={handleNewGame}>
            새 게임
          </button>
        </div>
      </header>

      <section className="board">
        {game.map.map((row, r) =>
          row.map((value, c) => (
            <div
              key={`${r}-${c}`}
              className={
                value === null ? 'cell' : `cell tile-${value} tile-not-empty`
              }
            >
              {value !== null ? value : ''}
            </div>
          ))
        )}
      </section>

      {game.finished && (
        <div className="overlay">
          <div className="panel">
            <h2>128 타일 달성</h2>
            <button className="btn" type="button" onClick={handleNewGame}>
              다시 시작
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;

/* ----------------- 아래는 순수 로직 함수들 ----------------- */

function emptyMap(r: number, c: number): Grid {
  return Array.from({ length: r }, () => Array.from({ length: c }, () => null));
}

function empties(map: Grid): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[0].length; j++) {
      if (map[i][j] === null) out.push([i, j]);
    }
  }
  return out;
}

function spawn(map: Grid): boolean {
  const e = empties(map);
  if (!e.length) return false;
  const [i, j] = e[Math.floor(Math.random() * e.length)];
  map[i][j] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function reached(map: Grid, t: number): boolean {
  return map.some((r) => r.some((v) => v !== null && v >= t));
}

function keyToDirection(key: string): Direction | null {
  if (key === 'ArrowUp') return 'up';
  if (key === 'ArrowRight') return 'right';
  if (key === 'ArrowDown') return 'down';
  if (key === 'ArrowLeft') return 'left';
  return null;
}

function cloneMap(map: Grid): Grid {
  return map.map((row) => [...row]);
}

function moveMapIn2048Rule(map: Grid, direction: Direction) {
  const rotated = rotateMap(map, rotateMapDeg[direction]);
  const { result, isMoved, gained } = moveLeft(rotated);
  return {
    result: rotateMap(result, revertMapDeg[direction]),
    isMoved,
    gained,
  };
}

function rotateMap(map: Grid, deg: 0 | 90 | 180 | 270): Grid {
  const R = map.length;
  const C = map[0].length;

  if (deg === 0) {
    return cloneMap(map);
  }

  if (deg === 90) {
    return Array.from({ length: C }, (_, c) =>
      Array.from({ length: R }, (_, r) => map[r][C - c - 1])
    );
  }

  if (deg === 180) {
    return Array.from({ length: R }, (_, r) =>
      Array.from({ length: C }, (_, c) => map[R - r - 1][C - c - 1])
    );
  }

  // 270
  return Array.from({ length: C }, (_, c) =>
    Array.from({ length: R }, (_, r) => map[R - r - 1][c])
  );
}

function moveLeft(map: Grid) {
  const rows = map.map(moveRowLeft);
  const gained = rows.reduce((s, x) => s + x.gained, 0);
  return {
    result: rows.map((x) => x.result),
    isMoved: rows.some((x) => x.isMoved),
    gained,
  };
}

function moveRowLeft(row: Tile[]) {
  const red = row.reduce(
    (acc, cell) => {
      if (cell === null) return acc;

      if (acc.last === null) {
        return { ...acc, last: cell };
      }

      if (acc.last === cell && cell * 2 <= TARGET_TILE) {
        return {
          result: [...acc.result, cell * 2],
          last: null,
          gained: acc.gained + cell * 2,
        };
      }

      return {
        result: [...acc.result, acc.last],
        last: cell,
        gained: acc.gained,
      };
    },
    { last: null as Tile, result: [] as Tile[], gained: 0 }
  );

  const arr: Tile[] = [...red.result, red.last];
  const out: Tile[] = Array.from({ length: row.length }, (_, i) => arr[i] ?? null);

  return {
    result: out,
    isMoved: row.some((v, i) => v !== out[i]),
    gained: red.gained,
  };
}

function save(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

