import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import type { Province, State } from "../../../packages/shared/index";
import { BattleMap } from "./Map";
import { Admin } from "./Admin";
import { LightSoundscape } from "./audio";
import "./style.css";

function PortraitBroadcast({
  state,
  provinces,
  selected,
  setSelected,
  connected,
}: {
  state: State;
  provinces: Province[];
  selected: string;
  setSelected: (id: string) => void;
  connected: boolean;
}) {
  const sound = useRef<LightSoundscape | undefined>(undefined);
  const announced = useRef<string | undefined>(undefined);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const seconds = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  const claimed = state.territories.filter((t) => t.owner).length;
  const leader = state.players[0];
  const latestEffect = state.effects.at(-1);
  const latestProvinceName = latestEffect
    ? provinces.find((p) => p.id === latestEffect.province)?.name
    : undefined;
  useEffect(() => {
    const readVoices = () => {
      const available = window.speechSynthesis?.getVoices() ?? [];
      setVoices(available.filter((voice) => voice.lang.toLowerCase().startsWith("vi")));
    };
    readVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", readVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", readVoices);
  }, []);
  useEffect(() => {
    if (!latestEffect) return;
    if (!announced.current) {
      announced.current = latestEffect.id;
      return;
    }
    if (announced.current === latestEffect.id) return;
    announced.current = latestEffect.id;
    if (audioEnabled && latestEffect.kind === "capture")
      sound.current?.announce(latestEffect.player, latestProvinceName ?? "thành phố", voiceName);
  }, [audioEnabled, latestEffect?.id, latestEffect?.kind, latestEffect?.player, latestProvinceName, voiceName]);
  useEffect(() => () => sound.current?.stop(), []);
  const enableAudio = () => {
    sound.current ??= new LightSoundscape();
    sound.current.start();
    setAudioEnabled(true);
  };
  const selectedProvince = provinces.find((p) => p.id === selected) ?? provinces[0];
  const selectedTerritory = state.territories.find(
    (t) => t.id === selectedProvince.id,
  );
  const selectedTeam = state.settings.teams.find(
    (t) => t.id === selectedTerritory?.owner,
  );
  const claimedProvinces = state.territories
    .filter((territory) => territory.owner)
    .map((territory) => ({
      name: provinces.find((province) => province.id === territory.id)?.name ?? territory.id,
      team: state.settings.teams.find((team) => team.id === territory.owner),
    }));
  const featured = latestEffect
    ? `${latestEffect.player} vừa ${latestEffect.kind === "capture" ? "thắp sáng" : latestEffect.kind === "heal" ? "tiếp năng lượng cho" : "gửi ánh sáng tới"} ${latestProvinceName ?? "một vùng"}`
    : state.feed[0] ?? "Bình luận tên tỉnh, thành để thắp sáng bản đồ";
  return (
    <main className="portrait-live" aria-label="Màn hình phát TikTok dọc">
      <header className="portrait-header">
        <div className="portrait-live-badge"><i /> LIVE</div>
        <div className="portrait-title">
          <span>VIỆT NAM ĐẠI CHIẾN</span>
          <strong>THẮP SÁNG BẢN ĐỒ VIỆT NAM</strong>
        </div>
        <div className="portrait-clock">
          {state.phase === "running"
            ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
            : "SẴN SÀNG"}
        </div>
        <div className="portrait-audio">
          <button onClick={enableAudio} className={audioEnabled ? "active" : ""}>
            {audioEnabled ? "♫ ĐANG BẬT" : "🔈 BẬT ÂM"}
          </button>
          {audioEnabled && voices.length > 0 && (
            <select aria-label="Giọng đọc tiếng Việt" value={voiceName} onChange={(event) => setVoiceName(event.target.value)}>
              <option value="">Giọng Việt mặc định</option>
              {voices.map((voice) => <option key={voice.name} value={voice.name}>{voice.name}</option>)}
            </select>
          )}
        </div>
      </header>

      <section className="portrait-progress">
        <div><span>ĐÃ THẮP SÁNG</span><b>{claimed}/{provinces.length} TỈNH, THÀNH</b></div>
        <div className="portrait-track"><i style={{ width: `${(claimed / provinces.length) * 100}%` }} /></div>
      </section>

      <section className="portrait-arena">
        <div className="portrait-map-glow" />
        <BattleMap provinces={provinces} state={state} onSelect={setSelected} />
        <div className="portrait-province-chip">
          <span style={{ background: selectedTeam?.color ?? "#7f9aa7" }} />
          <b>{selectedProvince.name}</b>
          <small>{selectedTeam ? "ĐÃ LÊN ĐÈN" : "CHƯA LÊN ĐÈN"} · {Math.round(selectedTerritory?.hp ?? 0)} NL</small>
        </div>
        <aside className="portrait-side-panel">
          <section className="portrait-card conqueror-card">
            <small>⚡ ÁNH SÁNG MỚI</small>
            <p>{featured}</p>
          </section>
          <section className="portrait-card leaderboard-card">
            <small>🏆 BẢNG ĐIỂM THẮP ĐÈN · {state.phase === "running" ? "ĐANG DIỄN RA" : "CHỜ KHAI TRẬN"}</small>
            {state.players.slice(0, 4).map((player, index) => (
              <div className="portrait-rank" key={player.name + index}>
                <b>{index + 1}</b><span>{player.name}</span><strong>{player.score}</strong>
              </div>
            ))}
            {!state.players.length && <p className="portrait-empty">Bình luận để ghi tên lên bảng vàng</p>}
          </section>
          {leader && (
            <section className="portrait-card leader-card">
              <small>♛ NGƯỜI THẮP SÁNG DẪN ĐẦU</small>
              <div className="side-leader">
                <div className="side-avatar">
                  <span>{leader.name.slice(0, 1).toUpperCase()}</span>
                  {leader.avatar && <img src={leader.avatar} alt="" />}
                </div>
                <b>{leader.name}</b><strong>{leader.score}</strong>
              </div>
            </section>
          )}
          <section className="portrait-card claimed-card">
            <small>✦ TỈNH, THÀNH ĐÃ LÊN ĐÈN · {claimedProvinces.length}/{provinces.length}</small>
            {claimedProvinces.slice(0, 6).map((province) => (
              <div className="portrait-claim" key={province.name}>
                <i style={{ background: "#ffd34e" }} />
                <span>{province.name}</span><b>ĐÃ SÁNG</b>
              </div>
            ))}
            {claimedProvinces.length > 6 && <p className="portrait-empty">+ {claimedProvinces.length - 6} tỉnh khác</p>}
            {!claimedProvinces.length && <p className="portrait-empty">Hãy là người thắp ngọn đèn đầu tiên.</p>}
          </section>
        </aside>
      </section>

      <section className="portrait-cta">
        <span>GÕ TÊN TỈNH, THÀNH BẠN MUỐN THẮP</span>
        <strong>COMMENT “HÀ NỘI” ĐỂ BẬT ĐÈN THÀNH PHỐ</strong>
      </section>
      <section className="portrait-gifts">
        <span>🎁 TẶNG QUÀ ĐỂ GỬI THÊM ÁNH SÁNG</span>
        {state.settings.gifts.slice(0, 4).map((gift) => <b key={gift.id}>✦ {gift.name}</b>)}
        <i className={connected ? "online" : ""}>{connected ? "ĐỒNG BỘ LIVE" : "ĐANG KẾT NỐI"}</i>
      </section>
    </main>
  );
}

function App() {
  const [state, setState] = useState<State>();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("ha-noi");
  const broadcast = new URLSearchParams(location.search).has("broadcast");
  useEffect(() => {
    const load = () =>
      fetch("/api/map")
        .then((r) => {
          if (!r.ok) throw Error("Không tải được bản đồ");
          return r.json();
        })
        .then((p) => {
          setProvinces(p);
          setError("");
        })
        .catch((e) => setError(e.message));
    const socket = io();
    socket.on("connect", () => {
      setConnected(true);
      void load();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("state", setState);
    socket.on("mapChanged", load);
    return () => {
      socket.disconnect();
    };
  }, []);
  if (!state || !provinces.length)
    return (
      <main className="login">
        <h1>VIỆT NAM ĐẠI CHIẾN</h1>
        <p>{error || "Đang nhận trạng thái chiến trường…"}</p>
        <p>Kiểm tra backend đang chạy trên cổng 3001.</p>
      </main>
    );
  if (location.pathname === "/admin")
    return <Admin state={state} provinces={provinces} />;
  if (broadcast)
    return (
      <PortraitBroadcast
        state={state}
        provinces={provinces}
        selected={selected}
        setSelected={setSelected}
        connected={connected}
      />
    );
  const seconds = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  const province = provinces.find((p) => p.id === selected) ?? provinces[0];
  const territory = state.territories.find((t) => t.id === province.id);
  const owner = state.settings.teams.find((t) => t.id === territory?.owner);
  const winner = state.settings.teams.find((t) => t.id === state.winner);
  return (
    <div className={"broadcast-shell " + (broadcast ? "broadcast" : "")}>
      <header className="topbar">
        <a href="/" className="brand">
          VN<span> / ĐẠI CHIẾN</span>
        </a>
        <div className="top-meta">
          <span className="live-dot" />
          {state.phase === "running"
            ? "CHIẾN TRƯỜNG ĐANG MỞ"
            : state.phase === "ended"
              ? "TRẬN ĐẤU KẾT THÚC"
              : "SẴN SÀNG XUẤT TRẬN"}
        </div>
        {!broadcast && (
          <nav>
            <a href="/admin">Quản trị ↗</a>
            <a href="/?broadcast=1">Broadcast</a>
            <button
              className="secondary"
              onClick={() =>
                void document.documentElement
                  .requestFullscreen()
                  .catch(() =>
                    setError("Trình duyệt không cho phép toàn màn hình"),
                  )
              }
            >
              ⛶
            </button>
          </nav>
        )}
      </header>
      <main className="battle-layout">
        <aside className="left-hud">
          <span className="eyebrow">LÃNH THỔ LÀ VINH QUANG</span>
          <h1>
            VIỆT NAM
            <br />
            <em>ĐẠI CHIẾN</em>
          </h1>
          <p className="intro">
            Chọn một phe. Cùng đồng đội
            <br />
            viết nên chiến thắng.
          </p>
          <div className="timer">
            <small>THỜI GIAN CÒN LẠI</small>
            <strong>
              {state.phase === "waiting"
                ? "15:00"
                : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`}
            </strong>
            <div className="track">
              <i
                style={{
                  width: `${state.phase === "running" ? (seconds / state.settings.duration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <span className="eyebrow">THẾ TRẬN</span>
          <div className="teams">
            {state.settings.teams.map((team, i) => {
              const count = state.territories.filter(
                (t) => t.owner === team.id,
              ).length;
              return (
                <section
                  className="team"
                  key={team.id}
                  style={{ "--team": team.color } as React.CSSProperties}
                >
                  <span className="team-number">0{i + 1}</span>
                  <div>
                    <h3>{team.name}</h3>
                    <small>Bình luận “{team.keyword}”</small>
                  </div>
                  <strong>
                    {count}
                    <small> TỈNH</small>
                  </strong>
                  <div
                    className="team-progress"
                    style={{
                      width: `${Math.max(2, (count / provinces.length) * 100)}%`,
                    }}
                  />
                </section>
              );
            })}
          </div>
          <p className="neutral">
            ◇ {state.territories.filter((t) => !t.owner).length} vùng trung lập
          </p>
        </aside>
        <section className="map-panel">
          <div className="map-heading">
            <span className="eyebrow">BẢN ĐỒ TÁC CHIẾN</span>
            <span>{provinces.length} VÙNG</span>
          </div>
          <div className="map-grid" />
          <BattleMap
            provinces={provinces}
            state={state}
            onSelect={setSelected}
          />
          <span className="sea-label">BIỂN ĐÔNG</span>
          <div className="compass">
            N<br />↑<br />
            <small>W ─ E</small>
          </div>
          <div className="map-note">
            {state.settings.map === "historical63"
              ? "63 tỉnh/thành lịch sử • trước 2025"
              : "34 vùng gộp từ bản đồ lịch sử"}
            <br />
            <small>
              Dữ liệu geoBoundaries • không dùng xác định chủ quyền, địa giới
            </small>
          </div>
          <div className="province-detail">
            <select
              aria-label="Chọn tỉnh"
              value={province.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span style={{ color: owner?.color ?? "#a7bbc5" }}>
              {owner?.name ?? "Trung lập"}
            </span>
            <div className="track">
              <i
                style={{
                  width: `${((territory?.hp ?? 0) / state.settings.hp) * 100}%`,
                  background: owner?.color ?? "#72b6b8",
                }}
              />
            </div>
            <small>
              PHÒNG THỦ {Math.round(territory?.hp ?? 0)} / {state.settings.hp}
            </small>
          </div>
        </section>
        <aside className="right-hud">
          <section className="activity">
            <div className="section-title">
              <h2>Diễn biến</h2>
              <span className="live-dot" />
            </div>
            {state.feed.length ? (
              state.feed.slice(0, 4).map((f, i) => (
                <div className="feed-item" key={i}>
                  <span>✦</span>
                  <p>{f}</p>
                </div>
              ))
            ) : (
              <p className="empty">
                Chiến trường đang chờ những chiến binh đầu tiên.
              </p>
            )}
          </section>
          <section className="ranking">
            <div className="section-title">
              <h2>Chiến binh nổi bật</h2>
              <span>↗</span>
            </div>
            {state.players.slice(0, 5).map((p, i) => (
              <div className="rank" key={p.name + i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <b>{p.name}</b>
                  <small
                    style={{
                      color: state.settings.teams.find((t) => t.id === p.team)
                        ?.color,
                    }}
                  >
                    COMBO ×{p.combo}
                  </small>
                </div>
                <strong>{p.score}</strong>
              </div>
            ))}
            {!state.players.length && (
              <p className="empty">Bình luận để ghi tên lên bảng vàng.</p>
            )}
          </section>
          <section className="how-to">
            <span className="eyebrow">THAM CHIẾN NGAY</span>
            <h3>
              Mỗi bình luận.
              <br />
              Một bước tiến.
            </h3>
            <p>
              <b>01</b> Gõ <strong>đỏ / xanh / vàng</strong> để chọn phe
            </p>
            <p>
              <b>02</b> Gõ <strong>{state.settings.attackWord} hà nội</strong>{" "}
              để tấn công
            </p>
            <p>
              <b>03</b> Tặng quà để tiếp viện
            </p>
          </section>
        </aside>
      </main>
      <footer>
        <span>
          <i className="live-dot" />{" "}
          {connected ? "ĐỒNG BỘ CHIẾN TRƯỜNG" : "MẤT KẾT NỐI — ĐANG THỬ LẠI"}
        </span>
        <span>CHIẾM LÃNH THỔ · GIỮ PHÒNG TUYẾN · CÙNG CHIẾN THẮNG</span>
        <span>VIỆT NAM ĐẠI CHIẾN / 01</span>
      </footer>
      {error && <p role="alert">{error}</p>}
      {state.phase === "ended" && (
        <div className="result">
          <span className="eyebrow">KẾT QUẢ TRẬN ĐẤU</span>
          <h2 style={{ color: winner?.color }}>
            {winner ? `${winner.name} chiến thắng` : "Trận đấu hòa"}
          </h2>
          <p>
            {state.players[0]
              ? `MVP · ${state.players[0].name} · ${state.players[0].score} điểm`
              : "Chưa có đóng góp"}
          </p>
          {!broadcast && <a href="/admin">Điều hành trận tiếp theo ↗</a>}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
