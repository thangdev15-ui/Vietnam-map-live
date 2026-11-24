import type { AdminPanelProps } from "./types";
export function Overview({
  state,
  status,
  startMatch,
  endMatch,
  chooseMap,
  closeVote,
  pauseMatch,
  resumeMatch,
  busy,
}: Pick<AdminPanelProps, "state" | "status" | "startMatch" | "endMatch" | "chooseMap" | "closeVote" | "pauseMatch" | "resumeMatch" | "busy">) {
  return (
    <>
      <div className="metrics">
        {[
          ["Người chơi", status?.players.length],
          ["Sự kiện đã xử lý", state.processed],
          ["Hàng đợi", status?.queue],
          ["Máy chủ", "Online"],
        ].map(([k, v]) => (
          <section key={k}>
            <small>{k}</small>
            <h2 className="metric-value" key={String(v)}>{v}</h2>
          </section>
        ))}
      </div>
      <section>
        <h2>Điều khiển trận</h2>
        <p>Bắt đầu sẽ mở bình chọn bản đồ trong 30 giây. Điểm và lãnh thổ được làm mới; danh sách khóa được giữ lại.</p>
        <button className="command-start" disabled={Boolean(busy)} onClick={startMatch}>
          {busy === "start" ? "ĐANG MỞ BÌNH CHỌN…" : "✦ Mở bình chọn bản đồ"}
        </button>
        <button
          className="secondary command-end"
          disabled={Boolean(busy)}
          onClick={endMatch}
        >
          {busy === "end" ? "ĐANG KHÓA CHIẾN TRƯỜNG…" : "◼ Kết thúc trận"}
        </button>
        {state.phase === "running" && <button className="secondary command-end" disabled={Boolean(busy)} onClick={pauseMatch}>Ⅱ Tạm dừng trận</button>}
        {state.phase === "paused" && <button className="command-start" disabled={Boolean(busy)} onClick={resumeMatch}>▶ Tiếp tục trận</button>}
        {state.phase === "voting" && (
          <button className="secondary command-end" disabled={Boolean(busy)} onClick={closeVote}>
            {busy === "close-vote" ? "ĐANG CHỐT PHIẾU…" : "✓ Chốt bình chọn ngay"}
          </button>
        )}
        {(state.phase === "voting_tie" || state.phase === "vote_empty") && state.voting && (
          <div className="map-admin-choice">
            <b>{state.phase === "voting_tie" ? "Phiếu hòa: chọn chiến trường" : "Chưa có phiếu: chọn chiến trường"}</b>
            {state.voting.candidates.map((candidate) => (
              <button key={candidate.id} disabled={Boolean(busy)} onClick={() => chooseMap(candidate.id)}>
                {candidate.name} <small>({candidate.votes} phiếu)</small>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
