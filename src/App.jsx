import React, { useState } from "react";
import { motion } from "framer-motion";
import "./App.css";

const APP_BACKGROUND = "#dfe7e2";
const FRONT_COLOR = "#f59e0b";
const BACK_COLOR = "#10b981";
const DIM_OPACITY = 0.35;

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

function TeamSetupCard({ side, team, onChange, isServing, onSetServing }) {
  const order = [1, 2, 3, 4, 5, 6];

  return (
    <div className="team-card">
      <div className="team-card__header">
        <div>
          <div className="team-card__label">{side}チーム</div>
          <div className="team-card__name">{team.name}</div>
        </div>
        <button
          className={`team-card__set-serving ${isServing ? "team-card__set-serving--active" : ""}`}
          onClick={onSetServing}
        >
          {isServing ? "現在サーブ中" : "先にサーブ"}
        </button>
      </div>

      <div className="team-card__grid">
        {order.map((pos) => (
          <label key={pos} className="team-card__field">
            <div className="team-card__field-label">位置 P{pos}</div>
            <input
              className="team-card__input"
              value={team.positions[pos]}
              onChange={(e) =>
                onChange({
                  ...team,
                  positions: {
                    ...team.positions,
                    [pos]: e.target.value,
                  },
                })
              }
              placeholder={`P${pos} の背番号`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function PlayerMarker({ x, y, number, pos, scale: positionScale, isFront, isDimmed, isServer, isRight, isLeft, teamKey, onPlayerTap }) {
  const numericPos = Number(pos);
  const baseScale = positionScale;
  const scale = isServer && isRight ? baseScale * 0.8 : baseScale;
  const radius = (isServer ? 10.5 : 8.5) * scale;
  const strokeWidth = (isServer ? 2.8 : 0) * scale;
  const strokeColor = isServer ? "#111827" : "transparent";
  const numberFontSize = (isServer ? 9 : 8) * scale;
  const badgeWidth = 8 * scale;
  const badgeHeight = 6 * scale;
  const badgeTransform = `translate(${11 * scale},-${8 * scale})`;
  const badgeTextSize = 3.8 * scale;

  const outwardShift = isServer ? (isLeft ? -10 : isRight ? 15 : 0) : 0;

  return (
    <motion.g
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
      />
      <text
        x="0"
        y="0"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={numberFontSize}
        fontWeight="800"
        fill="#111"
      >
        {number}
      </text>
      {isServer && (
        <g transform={badgeTransform}>
          <rect width={badgeWidth} height={badgeHeight} rx="1.5" fill="#0f172a" />
          <text x={badgeWidth / 2} y={badgeHeight * 0.65} textAnchor="middle" fontSize={badgeTextSize} fontWeight="800" fill="white">
            S
          </text>
        </g>
      )}
    </motion.g>
  );
}

function CourtHalf({ side, team, isReceiving, isServing, onPlayerTap }) {
  const coords = side === "left" ? LEFT_POSITIONS : RIGHT_POSITIONS;
  const teamKey = side === "left" ? "A" : "B";
  
  // 選手一覧を作成：各選手が現在どのポジションにいるかを把握
  const players = Object.entries(team.positions).map(([pos, playerNumber]) => ({
    playerNumber,
    pos: Number(pos),
  }));

  return (
    <>
      {players.map(({ playerNumber, pos }) => {
        const point = coords[pos];
        const isFront = [2, 3, 4].includes(pos);
        const isServer = isServing && pos === 1;

        return (
          <PlayerMarker
            key={`${side}-player-${playerNumber}`}
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
          />
        );
      })}
    </>
  );
}

function CourtView({ match, compact = false, onPlayerTap }) {
  const receivingTeam = match.servingTeam === "A" ? "B" : "A";
  const leftIsReceiving = receivingTeam === "A";
  const rightIsReceiving = receivingTeam === "B";
  const baseFill = "#f2e3c6";
  const highlightFill = "#f7ead1";
  const leftStrokeWidth = leftIsReceiving ? 1.6 : 0.8;
  const rightStrokeWidth = rightIsReceiving ? 1.6 : 0.8;
  const leftFillOpacity = leftIsReceiving ? 1 : 0.85;
  const rightFillOpacity = rightIsReceiving ? 1 : 0.85;
  const courtStrokeColor = "#1f2937";
  const lineStrokeWidth = 1.6;

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
              左：{match.teams.A.name}
              {receivingTeam === "A" && <span className="court-card__badge">レシーブ側</span>}
            </div>
            <div>
              右：{match.teams.B.name}
              {receivingTeam === "B" && <span className="court-card__badge">レシーブ側</span>}
            </div>
          </div>
        </>
      )}

      <div className="court-svg-wrapper">
        <svg viewBox="0 0 160 74" className="court-svg">
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
            team={match.teams.A}
            isServing={match.servingTeam === "A"}
            isReceiving={receivingTeam === "A"}
            onPlayerTap={onPlayerTap}
          />
          <CourtHalf
            side="right"
            team={match.teams.B}
            isServing={match.servingTeam === "B"}
            isReceiving={receivingTeam === "B"}
            onPlayerTap={onPlayerTap}
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
  const [history, setHistory] = useState([]);
  const [substitutions, setSubstitutions] = useState({ A: {}, B: {} });
  const [longPressedPlayer, setLongPressedPlayer] = useState(null);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

  function updateTeam(teamKey, nextTeam) {
    setMatch((prev) => ({
      ...prev,
      teams: {
        ...prev.teams,
        [teamKey]: nextTeam,
      },
    }));
  }

  function handlePlayerTap(teamKey, pos, currentPlayerNumber) {
    setLongPressedPlayer({ teamKey, pos, currentPlayerNumber });
    setIsSubMenuOpen(true);
  }

  function handleSubstitute() {
    if (!longPressedPlayer) return;
    const { teamKey, pos, currentPlayerNumber } = longPressedPlayer;
    const newNumber = prompt(`P${pos} の新しい背番号を入力してください：`, "");
    if (newNumber === null || newNumber === "") return;

    setSubstitutions((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        [newNumber]: { original: currentPlayerNumber },
      },
    }));

    setMatch((prev) => ({
      ...prev,
      teams: {
        ...prev.teams,
        [teamKey]: {
          ...prev.teams[teamKey],
          positions: {
            ...prev.teams[teamKey].positions,
            [pos]: newNumber,
          },
        },
      },
    }));

    setIsSubMenuOpen(false);
    setLongPressedPlayer(null);
  }

  function handleUndoSubstitution() {
    if (!longPressedPlayer || !substitutions[longPressedPlayer.teamKey]?.[longPressedPlayer.currentPlayerNumber]) return;
    const { teamKey, pos, currentPlayerNumber } = longPressedPlayer;
    const original = substitutions[teamKey][currentPlayerNumber].original;

    setMatch((prev) => ({
      ...prev,
      teams: {
        ...prev.teams,
        [teamKey]: {
          ...prev.teams[teamKey],
          positions: {
            ...prev.teams[teamKey].positions,
            [pos]: original,
          },
        },
      },
    }));

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

  function handleSideOut() {
    setHistory((prev) => [...prev, match]);
    setMatch((prev) => {
      const nextServingTeam = prev.servingTeam === "A" ? "B" : "A";
      return {
        ...prev,
        servingTeam: nextServingTeam,
        teams: {
          ...prev.teams,
          [nextServingTeam]: {
            ...prev.teams[nextServingTeam],
            positions: rotateClockwise(prev.teams[nextServingTeam].positions),
          },
        },
      };
    });
  }

  function handleUndo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setMatch(previous);
    setHistory((prev) => prev.slice(0, -1));
  }

  function handleReset() {
    setMatch(INITIAL_MATCH);
    setHistory([]);
    setMode("setup");
  }

  return (
    <div className="app-shell" style={{ backgroundColor: APP_BACKGROUND }}>
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
            onClick={() => setMode("live")}
          >
            試合中表示
          </button>
        </div>
      </div>

      <div className="app-screen">
        {mode === "setup" ? (
          <div className="setup-screen">
            <TeamSetupCard
              side="A"
              team={match.teams.A}
              isServing={match.servingTeam === "A"}
              onSetServing={() => setMatch((prev) => ({ ...prev, servingTeam: "A" }))}
              onChange={(nextTeam) => updateTeam("A", nextTeam)}
            />
            <TeamSetupCard
              side="B"
              team={match.teams.B}
              isServing={match.servingTeam === "B"}
              onSetServing={() => setMatch((prev) => ({ ...prev, servingTeam: "B" }))}
              onChange={(nextTeam) => updateTeam("B", nextTeam)}
            />
          </div>
        ) : (
          <div className="live-screen">
            <div className="action-grid action-grid--live">
              <button className="secondary" onClick={() => setMode("setup")}>
                <span className="action-grid__text">サーブ順入力</span>
              </button>
              <button className="primary" onClick={handleSideOut}>
                <span className="action-grid__text">サイドアウト</span>
              </button>
              <button className="secondary" onClick={handleUndo}>
                <span className="action-grid__text">1つ戻す</span>
              </button>
              <button className="secondary" onClick={handleReset}>
                <span className="action-grid__text">最初から</span>
              </button>
            </div>
            <div className="court-area">
              <CourtView match={match} compact onPlayerTap={handlePlayerTap} />
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
          </div>
        )}
      </div>
    </div>
  );
}
