import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import type { Province, State } from "../../../packages/shared/index";
import { BattleMap } from "./Map";
import { Admin } from "./Admin";
import { LightSoundscape } from "./audio";
import { apiOrigin, backendUrl } from "./api";
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
  const directorSeen = useRef<string | undefined>(undefined);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [directorEvent, setDirectorEvent] = useState<State["effects"][number]>();
  const seconds = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  const voteSeconds = Math.max(0, Math.ceil(((state.voting?.endsAt ?? Date.now()) - Date.now()) / 1000));
  const claimed = state.territories.filter((t) => t.owner).length;
  const communityTarget = Math.min(provinces.length, Math.max(5, Math.ceil(provinces.length * 0.32)));
  const leader = state.players[0];
  const comboPlayer = state.players
    .filter((player) => player.combo >= state.settings.comboThreshold)
    .sort((a, b) => b.combo - a.combo)[0];
  const latestEffect = state.effects.at(-1);
  const latestDirectorEffect = [...state.effects].reverse().find((effect) =>
    ["capture", "super", "combo", "chest", "complete", "meteor", "lightning", "vortex", "starfall", "gift"].includes(effect.kind),
  );
  const mapCompleted = state.effects.some((effect) => effect.kind === "complete");
  const latestProvinceName = latestEffect
    ? provinces.find((p) => p.id === latestEffect.province)?.name
    : undefined;
  useEffect(() => {
    if (!latestEffect) return;
    if (!announced.current) {
      announced.current = latestEffect.id;
      return;
    }
    if (announced.current === latestEffect.id) return;
    announced.current = latestEffect.id;
    if (audioEnabled && latestEffect.kind === "capture")
      void sound.current?.announce(latestEffect.player, latestProvinceName ?? "thành phố");
  }, [audioEnabled, latestEffect?.id, latestEffect?.kind, latestEffect?.player, latestProvinceName]);
  useEffect(() => {
    if (!latestDirectorEffect) return;
    if (!directorSeen.current) {
      directorSeen.current = latestDirectorEffect.id;
      return;
    }
    if (directorSeen.current === latestDirectorEffect.id) return;
    directorSeen.current = latestDirectorEffect.id;
    setDirectorEvent(latestDirectorEffect);
    const clear = window.setTimeout(() => setDirectorEvent(undefined), latestDirectorEffect.kind === "complete" ? 5600 : 3600);
    return () => window.clearTimeout(clear);
  }, [latestDirectorEffect?.id]);
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
  const selectedContributors = selectedTerritory?.contributors ?? [];
  const nextTerritory = state.territories.filter((territory) => !territory.owner).sort((a, b) => a.hp - b.hp)[0];
  const nextProvince = nextTerritory ? provinces.find((province) => province.id === nextTerritory.id) : undefined;
  const nextProgress = nextTerritory ? Math.round((1 - nextTerritory.hp / state.settings.hp) * 100) : 100;
  const claimedProvinces = state.territories
    .filter((territory) => territory.owner)
    .map((territory) => ({
      name: provinces.find((province) => province.id === territory.id)?.name ?? territory.id,
      team: state.settings.teams.find((team) => team.id === territory.owner),
    }));
  const featured = latestEffect
    ? `${latestEffect.player} vừa ${latestEffect.kind === "capture" ? "thắp sáng" : latestEffect.kind === "heal" ? "tiếp năng lượng cho" : "gửi ánh sáng tới"} ${latestProvinceName ?? "một vùng"}`
    : state.feed[0] ?? "Bình luận tên tỉnh, thành để thắp sáng bản đồ";
  const directorProvince = directorEvent
    ? provinces.find((province) => province.id === directorEvent.province)?.name ?? "một vùng"
    : "";
  const directorKind = directorEvent?.kind === "super" ? "SIÊU ÁNH SÁNG" :
    directorEvent?.kind === "combo" ? "COMBO ÁNH SÁNG" :
    directorEvent?.kind === "chest" ? "RƯƠNG ÁNH SÁNG" :
    directorEvent?.kind === "complete" ? "BẢN ĐỒ BỪNG SÁNG" :
    directorEvent?.kind === "meteor" ? "THIÊN THẠCH ÁNH SÁNG" :
    directorEvent?.kind === "lightning" ? "THIÊN LÔI GIÁNG XUỐNG" :
    directorEvent?.kind === "vortex" ? "XOÁY NĂNG LƯỢNG" :
    directorEvent?.kind === "starfall" ? "MƯA SAO ÁNH SÁNG" :
    directorEvent?.kind === "gift" ? "QUÀ TIẾP SỨC" : "THÀNH PHỐ VỪA LÊN ĐÈN";
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
            {audioEnabled
              ? "♫ ÂM THANH ĐÃ BẬT"
              : "🔈 BẬT ÂM"}
          </button>
        </div>
      </header>

      <section className="portrait-progress">
        <div><span>ĐÃ THẮP SÁNG</span><b>{claimed}/{provinces.length} TỈNH, THÀNH</b></div>
        <div className="portrait-track"><i style={{ width: `${(claimed / provinces.length) * 100}%` }} /></div>
      </section>

      <section className="portrait-arena">
        <div className="portrait-map-glow" />
        <div className="portrait-atmosphere" aria-hidden="true"><i /><i /><i /></div>
        <BattleMap provinces={provinces} state={state} onSelect={setSelected} />
        {directorEvent && (
          <section className={`portrait-director-ribbon ribbon-${directorEvent.kind}`} key={directorEvent.id} aria-live="assertive">
            <div className="director-avatar">
              <span>{directorEvent.player.slice(0, 1).toUpperCase()}</span>
              {directorEvent.avatar && <img src={directorEvent.avatar} alt="" />}
            </div>
            <div className="director-copy">
              <small>✦ {directorKind}</small>
              <strong>{directorEvent.player}</strong>
              <span>{directorEvent.kind === "combo" ? `đạt chuỗi năng lượng tại ${directorProvince}` : `vừa thắp sáng ${directorProvince}`}</span>
            </div>
            <b className="director-points">+{directorEvent.power}</b>
            <i className="director-timer" />
          </section>
        )}
        {comboPlayer && (
          <div className="portrait-combo" aria-live="polite">
            <span>COMBO ×{comboPlayer.combo}</span>
            <b>{comboPlayer.name}</b>
            <small>CHUỖI ÁNH SÁNG ĐANG DUY TRÌ</small>
          </div>
        )}
        {state.phase === "voting" && state.voting && (
          <section className="map-vote-overlay" aria-live="polite">
            <div className="vote-kicker">BÌNH CHỌN CHIẾN TRƯỜNG</div>
            <strong>CHỌN BẢN ĐỒ LIVE</strong>
            <p>COMMENT SỐ BẢN ĐỒ · MỖI TÀI KHOẢN 1 PHIẾU</p>
            <div className="vote-countdown"><i /> {voteSeconds}<small>GIÂY</small></div>
            <div className="vote-candidates">
              {state.voting.candidates.map((candidate) => {
                const total = state.voting!.candidates.reduce((sum, item) => sum + item.votes, 0);
                const percent = total ? (candidate.votes / total) * 100 : 0;
                return <article className="vote-candidate" key={candidate.id}>
                  <span>MAP {candidate.keyword}</span>
                  <b>{candidate.name}</b>
                  <small>{candidate.description}</small>
                  <div><i style={{ width: `${percent}%` }} /></div>
                  <strong>{candidate.votes} PHIẾU</strong>
                </article>;
              })}
            </div>
          </section>
        )}
        {state.phase === "vote_result" && state.voting?.winner && (
          <section className="map-vote-result" aria-live="polite">
            <span>✦ CHIẾN TRƯỜNG ĐƯỢC CHỌN</span>
            <strong>{state.voting.candidates.find((candidate) => candidate.id === state.voting?.winner)?.name}</strong>
            <small>Đang thắp sáng bản đồ…</small>
          </section>
        )}
        {(state.phase === "voting_tie" || state.phase === "vote_empty") && (
          <section className="map-vote-result unresolved" aria-live="polite">
            <span>{state.phase === "voting_tie" ? "BÌNH CHỌN HÒA" : "CHƯA CÓ PHIẾU"}</span>
            <strong>ĐANG CHỜ QUẢN TRỊ VIÊN CHỌN BẢN ĐỒ</strong>
            <small>Không tự chọn ngẫu nhiên.</small>
          </section>
        )}
        {state.phase === "ended" && mapCompleted && (
          <section className="portrait-completion" aria-live="assertive">
            <span>✦ TOÀN BẢN ĐỒ BỪNG SÁNG ✦</span>
            <strong>VIỆT NAM ĐÃ ĐƯỢC THẮP SÁNG</strong>
            <div>
              {state.players.slice(0, 3).map((player, index) => (
                <p key={player.name}><b>#{index + 1}</b><i>{player.name}</i><em>{player.score}</em></p>
              ))}
            </div>
          </section>
        )}
        <div className="portrait-province-chip">
          <span style={{ background: selectedTeam?.color ?? "#7f9aa7" }} />
          <b>{selectedProvince.name}</b>
          <small>{selectedTeam ? "ĐÃ LÊN ĐÈN" : `${Math.round(((state.settings.hp - (selectedTerritory?.hp ?? state.settings.hp)) / state.settings.hp) * 100)}% ÁNH SÁNG`}</small>
        </div>
        {(selectedContributors.length > 0 || nextProvince) && (
          <section className="portrait-squad" aria-label="Tổ đội thắp sáng">
            {selectedContributors.length > 0 && <>
              <small>✦ TỔ ĐỘI THẮP SÁNG</small>
              <div className="squad-members">
                {selectedContributors.slice(0, 4).map((member) => <span key={member.id} title={member.name}>{member.avatar ? <img src={member.avatar} alt="" /> : member.name.slice(0, 1).toUpperCase()}</span>)}
                <b>{selectedContributors.length} NGƯỜI CÙNG THẮP</b>
              </div>
              <p>Comment <strong>“{selectedProvince.name}”</strong> để góp thêm ánh sáng.</p>
            </>}
            {nextProvince && <div className="next-light-target">
              <small>⚑ ĐIỂM NÓNG TIẾP THEO</small>
              <b>{nextProvince.name}</b><span>{nextProgress}% ÁNH SÁNG · CÙNG HOÀN THÀNH</span>
            </div>}
          </section>
        )}
        <aside className="portrait-side-panel">
          <section className="portrait-card conqueror-card">
            <small>⚡ ÁNH SÁNG MỚI</small>
            <p>{featured}</p>
          </section>
          <section className="portrait-card leaderboard-card">
            <small>🏆 BẢNG ĐIỂM THẮP ĐÈN · {state.phase === "running" ? "ĐANG DIỄN RA" : "CHỜ KHAI TRẬN"}</small>
            {state.players.slice(0, 4).map((player, index) => (
              <div className={"portrait-rank " + (index === 0 ? "rank-first" : "")} key={player.name + index + player.score}>
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
          <section className="portrait-card community-goal">
            <small>⚑ MỤC TIÊU CỘNG ĐỒNG <b>{claimed >= communityTarget ? "ĐÃ ĐẠT" : "ĐANG DIỄN RA"}</b></small>
            <strong>{Math.min(claimed, communityTarget)} / {communityTarget} <i>TỈNH</i></strong>
            <div><i style={{ width: `${Math.min(100, (claimed / communityTarget) * 100)}%` }} /></div>
            <p>{claimed >= communityTarget ? "Cả livestream đã mở cột mốc ánh sáng!" : `Còn ${communityTarget - claimed} tỉnh để kích hoạt cột mốc.`}</p>
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
      fetch(backendUrl("/api/map"))
        .then((r) => {
          if (!r.ok) throw Error("Không tải được bản đồ");
          return r.json();
        })
        .then((p) => {
          setProvinces(p);
          setError("");
        })
        .catch((e) => setError(e.message));
    const socket = io(apiOrigin || undefined);
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
            63 tỉnh/thành lịch sử • chiến trường {state.settings.map.replace(/-/g, " ")}
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
