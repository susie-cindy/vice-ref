import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import "./App.css";

const APP_BACKGROUND = "#dfe7e2";
const FRONT_COLOR = "#f59e0b";
const BACK_COLOR = "#10b981";
const DIM_OPACITY = 0.35;
const FRONT_ROW_POSITIONS = [2, 3, 4];
const SERVER_POSITION = 1;
const PLAYER_NUMBER_OPTIONS = Array.from({ length: 14 }, (_, i) => i + 1);
const TIMEOUT_TIMER_SECONDS = 30;
const SET_BREAK_TIMER_SECONDS = 150;
const TIMER_DONE_HOLD_MS = 5000;
const MotionGroup = motion.g;

const LEFT_POSITIONS = {
  4: { x: 61, y: 14, scale: 0.8 },
  3: { x: 57, y: 32, scale: 0.9 },
  2: { x: 52, y: 52, scale: 1 },
  5: { x: 30, y: 14, scale: 0.8 },
  6: { x: 20, y: 32, scale: 0.9 },
  1: { x: 10, y: 52, scale: 1 },
};

const RIGHT_POSITIONS = {
  2: { x: 99, y: 14, scale: 0.8 },
  3: { x: 103, y: 32, scale: 0.9 },
  4: { x: 108, y: 52, scale: 1 },
  1: { x: 130, y: 14, scale: 0.8 },
  6: { x: 140, y: 32, scale: 0.9 },
  5: { x: 150, y: 52, scale: 1 },
};

const INITIAL_MATCH = {
  servingTeam: "A",
  teams: {
    A: {
      name: "Aチーム",
      positions: {
        1: "1",
        2: "2",
        3: "3",
        4: "4",
        5: "5",
        6: "6",
      },
    },
    B: {
      name: "Bチーム",
      positions: {
        1: "1",
        2: "2",
        3: "3",
        4: "4",
        5: "5",
        6: "6",
      },
    },
  },
};

function rotateClockwise(positions) {
  return {
    1: positions[2],
    2: positions[3],
    3: positions[4],
    4: positions[5],
    5: positions[6],
    6: positions[1],
  };
}

function createEmptyPositions() {
  return {
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
  };
}

function formatTimerSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}`;
}

function vibrateTimerDone() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([300, 120, 300, 120, 500]);
  }
}

function isFrontRowPosition(pos) {
  return FRONT_ROW_POSITIONS.includes(Number(pos));
}

function shouldShowLiberoForPlayer({ teamKey, playerNumber, pos, liberoTargets, liberoSuppressed }) {
  const numericPos = Number(pos);
  return Boolean(
    liberoTargets[teamKey]?.[playerNumber] &&
      !isFrontRowPosition(numericPos) &&
      numericPos !== SERVER_POSITION &&
      !liberoSuppressed[teamKey]?.[playerNumber]
  );
}

function pruneFrontRowLiberoSuppressions(suppressed, teams) {
  let changed = false;
  const next = { A: {}, B: {} };

  for (const teamKey of ["A", "B"]) {
    const teamSuppressed = suppressed[teamKey] ?? {};
    const positions = teams[teamKey]?.positions ?? {};

    for (const [playerNumber, isSuppressed] of Object.entries(teamSuppressed)) {
      if (!isSuppressed) {
        changed = true;
        continue;
      }

      const currentEntry = Object.entries(positions).find(([, currentPlayerNumber]) => currentPlayerNumber === playerNumber);
      const currentPos = currentEntry ? Number(currentEntry[0]) : null;

      if (isFrontRowPosition(currentPos)) {
        changed = true;
        continue;
      }

      next[teamKey][playerNumber] = true;
    }

    const activeCount = Object.values(teamSuppressed).filter(Boolean).length;
    if (Object.keys(next[teamKey]).length !== activeCount) {
      changed = true;
    }
  }

  return changed ? next : suppressed;
}

function NumberPickerModal({ title, numbers, isNumberDisabled, onSelect, onCancel, onClear }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "20px",
          minWidth: "280px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "16px", fontSize: "14px", fontWeight: "600", textAlign: "center" }}>{title}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
          {numbers.map((num) => {
            const numberText = num.toString();
            const isDisabled = isNumberDisabled(numberText);
            return (
              <button
                key={num}
                onClick={() => !isDisabled && onSelect(numberText)}
                disabled={isDisabled}
                style={{
                  padding: "12px",
                  fontSize: "16px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: isDisabled ? "#d1d5db" : "#3b82f6",
                  color: "#fff",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                {num}
              </button>
            );
          })}
        </div>
        {onClear && (
          <button
            onClick={onClear}
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              marginBottom: "8px",
              backgroundColor: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            クリア
          </button>
        )}
        <button
          onClick={onCancel}
          style={{
            display: "block",
            width: "100%",
            padding: "12px",
            backgroundColor: "#6b7280",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function TeamSetupCard({ teamKey, courtSide, team, isServing, onSetServing, onPositionTap, onClearPositions }) {
  const order = [1, 2, 3, 4, 5, 6];
  const sideLabel = courtSide === "left" ? "左側" : "右側";
  const teamLabel = `${teamKey}チーム（${sideLabel}）`;

  return (
    <div className="team-card">
      <div className="team-card__header">
        <div className="team-card__identity">
          <div className="team-card__label">{teamLabel}</div>
          <button type="button" className="team-card__clear" onClick={onClearPositions}>
            オールクリア
          </button>
        </div>
        <button
          className={`team-card__set-serving ${isServing ? "team-card__set-serving--active" : ""}`}
          onClick={onSetServing}
        >
          {isServing ? "サーブ権" : "レセプション"}
        </button>
      </div>

      <div className="team-card__grid">
        {order.map((pos) => (
          <div key={pos} className="team-card__field">
            <div className="team-card__field-label">位置 P{pos}</div>
            <button
              type="button"
              className="team-card__input"
              onClick={() => onPositionTap(pos)}
            >
              {team.positions[pos] || "背番号を選択"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerMarker({ x, y, number, pos, scale: positionScale, isFront, isDimmed, isServer, isRight, isLeft, teamKey, onPlayerTap, displayLabel }) {
  const baseScale = positionScale;
  const scale = isServer && isRight ? baseScale * 0.8 : baseScale;
  const radius = (isServer ? 10.5 : 8.5) * scale;
  const strokeWidth = (isServer ? 2.8 : 0) * scale;
  const strokeColor = isServer ? "#111827" : "transparent";
  const numberFontSize = (isServer ? 9 : 8) * scale;
  const isLiberoDisplay = displayLabel === "L";
  const badgeWidth = 8 * scale;
  const badgeHeight = 6 * scale;
  const badgeTransform = `translate(${11 * scale},-${8 * scale})`;
  const badgeTextSize = 3.8 * scale;

  const outwardShift = isServer ? (isLeft ? -10 : isRight ? 15 : 0) : 0;

  return (
    <MotionGroup
      initial={false}
      animate={{ x: x + outwardShift, y, scale }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={{ opacity: isDimmed ? DIM_OPACITY : 1, transformOrigin: "center center", cursor: "pointer" }}
      onClick={() => onPlayerTap?.(teamKey, pos, number)}
    >
      {isServer && (
        <circle cx="0" cy="0" r={13 * scale} fill="none" stroke="#facc15" strokeWidth={2.5 * scale} opacity="0.95" />
      )}
      <circle
        r={radius}
        fill={isFront ? FRONT_COLOR : BACK_COLOR}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={isLiberoDisplay ? 0.9 : 1}
      />
      <text
        x="0"
        y="0"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={numberFontSize}
        fontWeight="800"
        fill={isLiberoDisplay ? "#dc2626" : "#111"}
      >
        {displayLabel}
      </text>
      {isServer && (
        <g transform={badgeTransform}>
          <rect width={badgeWidth} height={badgeHeight} rx="1.5" fill="#0f172a" />
          <text x={badgeWidth / 2} y={badgeHeight * 0.65} textAnchor="middle" fontSize={badgeTextSize} fontWeight="800" fill="white">
            S
          </text>
        </g>
      )}
    </MotionGroup>
  );
}

function CourtHalf({ side, teamKey, team, isReceiving, isServing, onPlayerTap, liberoTargets, liberoSuppressed }) {
  const coords = side === "left" ? LEFT_POSITIONS : RIGHT_POSITIONS;
  
  // 選手一覧を作成：各選手が現在どのポジションにいるかを把握
  const players = Object.entries(team.positions).map(([pos, playerNumber]) => ({
    playerNumber,
    pos: Number(pos),
  }));

  return (
    <>
      {players.map(({ playerNumber, pos }) => {
        const point = coords[pos];
        const isFront = isFrontRowPosition(pos);
        const isServer = isServing && pos === 1;
        
        const shouldShowLibero = shouldShowLiberoForPlayer({ teamKey, playerNumber, pos, liberoTargets, liberoSuppressed });
        const displayLabel = shouldShowLibero ? "L" : playerNumber;
        const markerKey = playerNumber ? `${teamKey}-player-${playerNumber}` : `${teamKey}-empty-${pos}`;

        return (
          <PlayerMarker
            key={markerKey}
            x={point.x}
            y={point.y}
            scale={point.scale}
            number={playerNumber}
            pos={pos}
            teamKey={teamKey}
            isFront={isFront}
            isDimmed={!isReceiving && !isServing}
            isServer={isServer}
            isRight={side === "right"}
            isLeft={side === "left"}
            onPlayerTap={onPlayerTap}
            displayLabel={displayLabel}
          />
        );
      })}
    </>
  );
}

function CourtView({ match, displayOrder, compact = false, onPlayerTap, liberoTargets, liberoSuppressed }) {
  const [leftTeamKey, rightTeamKey] = displayOrder;
  const receivingTeam = match.servingTeam === "A" ? "B" : "A";
  const leftIsReceiving = receivingTeam === leftTeamKey;
  const rightIsReceiving = receivingTeam === rightTeamKey;
  const baseFill = "#f2e3c6";
  const highlightFill = "#f7ead1";
  const leftStrokeWidth = leftIsReceiving ? 1.6 : 0.8;
  const rightStrokeWidth = rightIsReceiving ? 1.6 : 0.8;
  const leftFillOpacity = leftIsReceiving ? 1 : 0.85;
  const rightFillOpacity = rightIsReceiving ? 1 : 0.85;
  const courtStrokeColor = "#1f2937";
  const lineStrokeWidth = 1.6;
  const courtViewBox = compact ? "-14 0 178 74" : "0 0 160 74";

  return (
    <div className={`court-card ${compact ? "court-card--compact" : ""}`}>
      {!compact && (
        <>
          <div className="court-card__header">
            <div className="court-card__subtitle">副審ライブ</div>
            <h2 className="court-card__title">コートフォーメーション</h2>
          </div>

          <div className="court-card__meta">
            <div>
              左：{match.teams[leftTeamKey].name}
              {receivingTeam === leftTeamKey && <span className="court-card__badge">レシーブ側</span>}
            </div>
            <div>
              右：{match.teams[rightTeamKey].name}
              {receivingTeam === rightTeamKey && <span className="court-card__badge">レシーブ側</span>}
            </div>
          </div>
        </>
      )}

      <div className={`court-svg-wrapper ${compact ? "court-svg-wrapper--compact" : ""}`}>
        <svg viewBox={courtViewBox} className="court-svg">
          <polygon
            points="0,58 16,18 80,18 80,58"
            fill={leftIsReceiving ? highlightFill : baseFill}
            fillOpacity={leftFillOpacity}
            stroke={courtStrokeColor}
            strokeWidth={leftStrokeWidth}
            strokeLinecap="butt"
          />
          <polygon
            points="80,18 144,18 160,58 80,58"
            fill={rightIsReceiving ? highlightFill : baseFill}
            fillOpacity={rightFillOpacity}
            stroke={courtStrokeColor}
            strokeWidth={rightStrokeWidth}
            strokeLinecap="butt"
          />
          <line x1="80" y1="12" x2="80" y2="66" stroke={courtStrokeColor} strokeWidth={lineStrokeWidth} strokeLinecap="butt" />

          <CourtHalf
            side="left"
            teamKey={leftTeamKey}
            team={match.teams[leftTeamKey]}
            isServing={match.servingTeam === leftTeamKey}
            isReceiving={receivingTeam === leftTeamKey}
            onPlayerTap={onPlayerTap}
            liberoTargets={liberoTargets}
            liberoSuppressed={liberoSuppressed}
          />
          <CourtHalf
            side="right"
            teamKey={rightTeamKey}
            team={match.teams[rightTeamKey]}
            isServing={match.servingTeam === rightTeamKey}
            isReceiving={receivingTeam === rightTeamKey}
            onPlayerTap={onPlayerTap}
            liberoTargets={liberoTargets}
            liberoSuppressed={liberoSuppressed}
          />
        </svg>
      </div>

      {!compact && (
        <div className="court-legends">
          <div className="court-legend">
            <span className="court-legend-dot" style={{ backgroundColor: FRONT_COLOR }} />
            前衛
          </div>
          <div className="court-legend">
            <span className="court-legend-dot" style={{ backgroundColor: BACK_COLOR }} />
            後衛
          </div>
          <div className="court-legend">
            <span className="court-legend-dot" style={{ backgroundColor: "#fff", border: "2px solid #0f172a" }} />
            サーバー
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("setup");
  const [match, setMatch] = useState(INITIAL_MATCH);
  const [displayOrder, setDisplayOrder] = useState(["A", "B"]);
  const [history, setHistory] = useState([]);
  const [substitutions, setSubstitutions] = useState({ A: {}, B: {} });
  const [longPressedPlayer, setLongPressedPlayer] = useState(null);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [isNumberPickerOpen, setIsNumberPickerOpen] = useState(false);
  const [pendingSubTarget, setPendingSubTarget] = useState(null);
  const [lineupNumberPickerTarget, setLineupNumberPickerTarget] = useState(null);
  const [liberoTargets, setLiberoTargets] = useState({ A: {}, B: {} });
  const [liberoSuppressed, setLiberoSuppressed] = useState({ A: {}, B: {} });
  const [activeTimer, setActiveTimer] = useState(null);
  const wakeLockRef = useRef(null);
  const wakeLockRequestRef = useRef(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [wakeLockError, setWakeLockError] = useState(null);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      setWakeLockError("unsupported");
      setIsWakeLockActive(false);
      return;
    }

    if (wakeLockRef.current) {
      setWakeLockError(null);
      setIsWakeLockActive(true);
      return;
    }

    if (wakeLockRequestRef.current) {
      try {
        await wakeLockRequestRef.current;
      } catch {
        // The original request handles the failure and updates UI state.
      }
      return;
    }

    try {
      wakeLockRequestRef.current = navigator.wakeLock.request("screen");
      const wakeLock = await wakeLockRequestRef.current;
      wakeLockRef.current = wakeLock;
      setWakeLockError(null);
      setIsWakeLockActive(true);

      wakeLock.addEventListener("release", () => {
        if (wakeLockRef.current === wakeLock) {
          wakeLockRef.current = null;
        }
        setIsWakeLockActive(false);
      });
    } catch (error) {
      console.warn("Screen Wake Lock request failed.", error);
      wakeLockRef.current = null;
      setWakeLockError(error);
      setIsWakeLockActive(false);
    } finally {
      wakeLockRequestRef.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const wakeLock = wakeLockRef.current;
    if (!wakeLock) return;

    wakeLockRef.current = null;
    try {
      await wakeLock.release();
    } catch (error) {
      console.warn("Screen Wake Lock release failed.", error);
    } finally {
      setIsWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      if (mode === "live") {
        requestWakeLock();
      } else {
        releaseWakeLock();
      }
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [mode, releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && mode === "live") {
        requestWakeLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mode, requestWakeLock]);

  useEffect(() => {
    if (!activeTimer || activeTimer.phase !== "running") return undefined;

    const intervalId = window.setInterval(() => {
      setActiveTimer((prev) => {
        if (!prev || prev.id !== activeTimer.id || prev.phase !== "running") return prev;
        const remainingSeconds = Math.max(0, Math.ceil((prev.endsAt - Date.now()) / 1000));
        if (remainingSeconds === 0) {
          return { ...prev, seconds: 0, phase: "done" };
        }
        return { ...prev, seconds: remainingSeconds };
      });
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer || activeTimer.phase !== "done") return undefined;

    vibrateTimerDone();
    const timeoutId = window.setTimeout(() => {
      if (activeTimer.type === "setBreak") {
        setMode("live");
        requestWakeLock();
      }
      setActiveTimer((prev) => (prev?.id === activeTimer.id ? null : prev));
    }, TIMER_DONE_HOLD_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeTimer, requestWakeLock]);

  const wakeLockStatusLabel = isWakeLockActive
    ? "画面常時ON"
    : wakeLockError === "unsupported"
      ? "画面ON非対応"
      : wakeLockError
        ? "画面ON失敗"
        : "画面ON準備中";

  function syncLiberoSuppressions(teams) {
    setLiberoSuppressed((prev) => pruneFrontRowLiberoSuppressions(prev, teams));
  }

  function commitMatchOnNextFrame(nextMatch) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMatch(nextMatch);
        syncLiberoSuppressions(nextMatch.teams);
      });
    });
  }

  function toggleInitialServingTeam(teamKey) {
    setMatch((prev) => ({
      ...prev,
      servingTeam: prev.servingTeam === teamKey ? (teamKey === "A" ? "B" : "A") : teamKey,
    }));
  }

  function swapDisplayOrder() {
    setDisplayOrder((prev) => [prev[1], prev[0]]);
    setMatch((prev) => ({
      ...prev,
      servingTeam: prev.servingTeam === "A" ? "B" : "A",
    }));
  }

  function startTimeoutTimer() {
    requestWakeLock();
    setActiveTimer({
      id: Date.now(),
      type: "timeout",
      seconds: TIMEOUT_TIMER_SECONDS,
      endsAt: Date.now() + TIMEOUT_TIMER_SECONDS * 1000,
      phase: "running",
      previousMode: mode,
      restoreState: null,
    });
  }

  function startSetBreakTimer() {
    setActiveTimer({
      id: Date.now(),
      type: "setBreak",
      seconds: SET_BREAK_TIMER_SECONDS,
      endsAt: Date.now() + SET_BREAK_TIMER_SECONDS * 1000,
      phase: "running",
      previousMode: mode,
      restoreState: {
        displayOrder,
        servingTeam: match.servingTeam,
      },
    });
    swapDisplayOrder();
    setMode("setup");
  }

  function cancelActiveTimer() {
    if (activeTimer?.type === "setBreak" && activeTimer.restoreState) {
      setDisplayOrder(activeTimer.restoreState.displayOrder);
      setMatch((prev) => ({
        ...prev,
        servingTeam: activeTimer.restoreState.servingTeam,
      }));
    }

    if (activeTimer?.previousMode) {
      setMode(activeTimer.previousMode);
    }

    setActiveTimer(null);
  }

  function openLineupNumberPicker(teamKey, pos) {
    setLineupNumberPickerTarget({ teamKey, pos });
  }

  function handleSelectLineupNumber(playerNumber) {
    if (!lineupNumberPickerTarget) return;
    const { teamKey, pos } = lineupNumberPickerTarget;
    const nextMatch = {
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...match.teams[teamKey],
          positions: {
            ...match.teams[teamKey].positions,
            [pos]: playerNumber,
          },
        },
      },
    };
    setMatch(nextMatch);
    syncLiberoSuppressions(nextMatch.teams);
    setLineupNumberPickerTarget(null);
  }

  function handleClearLineupNumber() {
    if (!lineupNumberPickerTarget) return;
    handleSelectLineupNumber("");
  }

  function handleClearTeamPositions(teamKey) {
    const nextMatch = {
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...match.teams[teamKey],
          positions: createEmptyPositions(),
        },
      },
    };
    setMatch(nextMatch);
    syncLiberoSuppressions(nextMatch.teams);
  }

  function handlePlayerTap(teamKey, pos, currentPlayerNumber) {
    setLongPressedPlayer({ teamKey, pos, currentPlayerNumber });
    setIsSubMenuOpen(true);
  }

  function handleSubstitute() {
    if (!longPressedPlayer) return;
    const { teamKey, pos, currentPlayerNumber } = longPressedPlayer;
    setPendingSubTarget({ teamKey, pos, currentPlayerNumber });
    setIsNumberPickerOpen(true);
    setIsSubMenuOpen(false);
  }

  function handleSelectSubstituteNumber(newNumber) {
    if (!pendingSubTarget) return;
    const { teamKey, pos, currentPlayerNumber } = pendingSubTarget;

    setSubstitutions((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        [newNumber]: { original: currentPlayerNumber },
      },
    }));

    const nextMatch = {
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...match.teams[teamKey],
          positions: {
            ...match.teams[teamKey].positions,
            [pos]: newNumber,
          },
        },
      },
    };
    setMatch(nextMatch);
    syncLiberoSuppressions(nextMatch.teams);

    setIsNumberPickerOpen(false);
    setPendingSubTarget(null);
    setLongPressedPlayer(null);
  }

  function handleUndoSubstitution() {
    if (!longPressedPlayer || !substitutions[longPressedPlayer.teamKey]?.[longPressedPlayer.currentPlayerNumber]) return;
    const { teamKey, pos, currentPlayerNumber } = longPressedPlayer;
    const original = substitutions[teamKey][currentPlayerNumber].original;

    const nextMatch = {
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...match.teams[teamKey],
          positions: {
            ...match.teams[teamKey].positions,
            [pos]: original,
          },
        },
      },
    };
    setMatch(nextMatch);
    syncLiberoSuppressions(nextMatch.teams);

    setSubstitutions((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        [currentPlayerNumber]: undefined,
      },
    }));

    setIsSubMenuOpen(false);
    setLongPressedPlayer(null);
  }

  function handleSetLiberoTarget() {
    if (!longPressedPlayer) return;
    const { teamKey, currentPlayerNumber } = longPressedPlayer;
    
    setLiberoTargets((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        [currentPlayerNumber]: true,
      },
    }));

    setIsSubMenuOpen(false);
    setLongPressedPlayer(null);
  }

  function handleRevertLibero() {
    if (!longPressedPlayer) return;
    const { teamKey, currentPlayerNumber } = longPressedPlayer;
    
    setLiberoSuppressed((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        [currentPlayerNumber]: true,
      },
    }));

    setIsSubMenuOpen(false);
    setLongPressedPlayer(null);
  }

  function handleRemoveLiberoTarget() {
    if (!longPressedPlayer) return;
    const { teamKey, currentPlayerNumber } = longPressedPlayer;
    
    setLiberoTargets((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        [currentPlayerNumber]: undefined,
      },
    }));

    setLiberoSuppressed((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        [currentPlayerNumber]: undefined,
      },
    }));

    setIsSubMenuOpen(false);
    setLongPressedPlayer(null);
  }

  function handleSideOut() {
    requestWakeLock();
    setHistory((prev) => [...prev, match]);
    const nextServingTeam = match.servingTeam === "A" ? "B" : "A";
    const nextMatch = {
      ...match,
      servingTeam: nextServingTeam,
      teams: {
        ...match.teams,
        [nextServingTeam]: {
          ...match.teams[nextServingTeam],
          positions: rotateClockwise(match.teams[nextServingTeam].positions),
        },
      },
    };
    commitMatchOnNextFrame(nextMatch);
  }

  function handleUndo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setMatch(previous);
    syncLiberoSuppressions(previous.teams);
    setHistory((prev) => prev.slice(0, -1));
  }

  return (
    <div className={`app-shell app-shell--${mode}`} style={{ backgroundColor: APP_BACKGROUND }}>
      <div className={`app-header ${mode === "live" ? "app-header--hidden" : ""}`}>
        {mode !== "live" && (
          <div className="app-header__brand">
            <div className="app-header__label">副審用</div>
            <h1 className="app-header__title">フォーメーション確認</h1>
          </div>
        )}
        <div className="app-mode-tabs">
          <button
            className={`app-mode-button ${mode === "setup" ? "app-mode-button--active" : ""}`}
            onClick={() => setMode("setup")}
          >
            サーブ順入力
          </button>
          <button
            className={`app-mode-button ${mode === "live" ? "app-mode-button--active" : ""}`}
            onClick={() => {
              setMode("live");
              requestWakeLock();
            }}
          >
            試合中表示
          </button>
        </div>
      </div>

      <div className="app-screen">
        {mode === "setup" ? (
          <div className="setup-screen">
            <div className="setup-screen__actions">
              <button type="button" className="setup-screen__swap" onClick={swapDisplayOrder}>
                左右入れ替え
              </button>
            </div>
            {displayOrder.map((teamKey, index) => (
              <TeamSetupCard
                key={teamKey}
                teamKey={teamKey}
                courtSide={index === 0 ? "left" : "right"}
                team={match.teams[teamKey]}
                isServing={match.servingTeam === teamKey}
                onSetServing={() => toggleInitialServingTeam(teamKey)}
                onPositionTap={(pos) => openLineupNumberPicker(teamKey, pos)}
                onClearPositions={() => handleClearTeamPositions(teamKey)}
              />
            ))}
          </div>
        ) : (
          <div className="live-screen">
            <div className={`wake-lock-status ${isWakeLockActive ? "wake-lock-status--active" : "wake-lock-status--muted"}`}>
              {wakeLockStatusLabel}
            </div>
            <div className="court-area">
              <CourtView match={match} displayOrder={displayOrder} compact onPlayerTap={handlePlayerTap} liberoTargets={liberoTargets} liberoSuppressed={liberoSuppressed} />
            </div>

            <div className="action-grid action-grid--live">
              <button className="secondary" onClick={() => setMode("setup")}>
                <span className="action-grid__text">サーブ順入力</span>
              </button>
              <button className="primary action-grid__sideout" onClick={handleSideOut}>
                <span className="action-grid__text">サイドアウト</span>
              </button>
              <button className="secondary" onClick={handleUndo}>
                <span className="action-grid__text">1つ戻す</span>
              </button>
              <button className="secondary" onClick={startSetBreakTimer}>
                <span className="action-grid__text">セット間</span>
              </button>
              <button className="secondary" onClick={startTimeoutTimer}>
                <span className="action-grid__text">TO</span>
              </button>
            </div>
            {isSubMenuOpen && longPressedPlayer && (
              <div style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000
              }} onClick={() => setIsSubMenuOpen(false)}>
                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  padding: "20px",
                  minWidth: "200px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ marginBottom: "16px", fontSize: "14px", fontWeight: "600" }}>
                    P{longPressedPlayer.pos} の操作
                  </div>
                  <button onClick={handleSubstitute} style={{
                    display: "block",
                    width: "100%",
                    padding: "12px",
                    marginBottom: "8px",
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}>
                    交代する
                  </button>
                  <button
                    onClick={handleUndoSubstitution}
                    disabled={!substitutions[longPressedPlayer.teamKey]?.[longPressedPlayer.currentPlayerNumber]}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px",
                      marginBottom: "8px",
                      backgroundColor: substitutions[longPressedPlayer.teamKey]?.[longPressedPlayer.currentPlayerNumber] ? "#10b981" : "#d1d5db",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: substitutions[longPressedPlayer.teamKey]?.[longPressedPlayer.currentPlayerNumber] ? "pointer" : "not-allowed",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    元に戻す
                  </button>

                  {(() => {
                    const isLiberoTarget = liberoTargets[longPressedPlayer.teamKey]?.[longPressedPlayer.currentPlayerNumber];
                    const shouldShowLibero = shouldShowLiberoForPlayer({
                      teamKey: longPressedPlayer.teamKey,
                      playerNumber: longPressedPlayer.currentPlayerNumber,
                      pos: longPressedPlayer.pos,
                      liberoTargets,
                      liberoSuppressed,
                    });

                    if (!isLiberoTarget) {
                      return (
                        <button onClick={handleSetLiberoTarget} style={{
                          display: "block",
                          width: "100%",
                          padding: "12px",
                          marginBottom: "8px",
                          backgroundColor: "#f59e0b",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}>
                          リベロ対象にする
                        </button>
                      );
                    }

                    if (shouldShowLibero) {
                      return (
                        <button onClick={handleRevertLibero} style={{
                          display: "block",
                          width: "100%",
                          padding: "12px",
                          marginBottom: "8px",
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}>
                          リベロを戻す
                        </button>
                      );
                    }

                    if (isLiberoTarget) {
                      return (
                        <button onClick={handleRemoveLiberoTarget} style={{
                          display: "block",
                          width: "100%",
                          padding: "12px",
                          marginBottom: "8px",
                          backgroundColor: "#8b5cf6",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}>
                          リベロ対象解除
                        </button>
                      );
                    }
                  })()}

                  <button onClick={() => setIsSubMenuOpen(false)} style={{
                    display: "block",
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#6b7280",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {isNumberPickerOpen && pendingSubTarget && (
              <NumberPickerModal
                title="交代選手の背番号を選択"
                numbers={PLAYER_NUMBER_OPTIONS}
                isNumberDisabled={(numberText) => Object.values(match.teams[pendingSubTarget.teamKey].positions).includes(numberText)}
                onSelect={handleSelectSubstituteNumber}
                onCancel={() => setIsNumberPickerOpen(false)}
              />
            )}
          </div>
        )}
        {lineupNumberPickerTarget && (
          <NumberPickerModal
            title={`P${lineupNumberPickerTarget.pos} の背番号を選択`}
            numbers={PLAYER_NUMBER_OPTIONS}
            isNumberDisabled={(numberText) =>
              Object.entries(match.teams[lineupNumberPickerTarget.teamKey].positions).some(
                ([pos, currentPlayerNumber]) => Number(pos) !== Number(lineupNumberPickerTarget.pos) && currentPlayerNumber === numberText
              )
            }
            onSelect={handleSelectLineupNumber}
            onCancel={() => setLineupNumberPickerTarget(null)}
            onClear={handleClearLineupNumber}
          />
        )}
      </div>
      {activeTimer?.type === "setBreak" && (
        <div className={`floating-timer ${activeTimer.phase === "done" ? "floating-timer--done" : ""}`}>
          <div className="floating-timer__label">セット間</div>
          <div className="floating-timer__time">{formatTimerSeconds(activeTimer.seconds)}</div>
          <button type="button" className="timer-cancel-button" onClick={cancelActiveTimer}>
            取消
          </button>
        </div>
      )}
      {activeTimer?.type === "timeout" && (
        <div className={`timeout-timer-overlay ${activeTimer.phase === "done" ? "timeout-timer-overlay--done" : ""}`}>
          <div className="timeout-timer-overlay__label">タイムアウト</div>
          <div className="timeout-timer-overlay__time">{formatTimerSeconds(activeTimer.seconds)}</div>
          <button type="button" className="timeout-timer-overlay__cancel" onClick={cancelActiveTimer}>
            取消
          </button>
        </div>
      )}
    </div>
  );
}
