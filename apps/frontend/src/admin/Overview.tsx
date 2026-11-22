import type { AdminPanelProps } from "./types";
export function Overview({
  state,
  status,
  startMatch,
  endMatch,
  busy,
}: Pick<AdminPanelProps, "state" | "status" | "startMatch" | "endMatch" | "busy">) {
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
        <p>Trận mới xóa điểm và lãnh thổ; danh sách khóa được giữ lại.</p>
        <button className="command-start" disabled={Boolean(busy)} onClick={startMatch}>
          {busy === "start" ? "ĐANG TRIỂN KHAI…" : "✦ Bắt đầu trận mới"}
        </button>
        <button
          className="secondary command-end"
          disabled={Boolean(busy)}
          onClick={endMatch}
        >
          {busy === "end" ? "ĐANG KHÓA CHIẾN TRƯỜNG…" : "◼ Kết thúc trận"}
        </button>
      </section>
    </>
  );
}
