import type { AdminPanelProps } from "./types";
export function Simulator({
  state,
  viewer,
  setViewer,
  message,
  setMessage,
  gift,
  setGift,
  count,
  setCount,
  send,
  burst,
  busy,
  demoWave,
  demoTotal,
}: Pick<
  AdminPanelProps,
  | "state"
  | "viewer"
  | "setViewer"
  | "message"
  | "setMessage"
  | "gift"
  | "setGift"
  | "count"
  | "setCount"
  | "send"
  | "burst"
  | "busy"
  | "demoWave"
  | "demoTotal"
>) {
  return (
    <section>
      <span className="badge">DEMO • không kết nối TikTok</span>
      <h2>Gửi sự kiện vào game engine</h2>
      <div className="form-grid">
        <label>
          Username
          <input value={viewer} onChange={(e) => setViewer(e.target.value)} />
        </label>
        <label>
          Bình luận
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <label>
          Gift ID
          <input value={gift} onChange={(e) => setGift(e.target.value)} />
        </label>
        <label>
          Số lượng
          <input
            type="number"
            min="1"
            max="10000"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
      </div>
      <p>
        Bắt đầu trận ở Tổng quan, rồi gửi đúng tên một tỉnh/thành để thắp đèn.
      </p>
      <div className="quick-commands" aria-label="Lệnh mẫu">
        <span>Lệnh mẫu:</span>
        <button
          className="secondary"
          onClick={() => setMessage("hà nội")}
        >
          Thắp sáng Hà Nội
        </button>
        <button
          className="secondary"
          onClick={() => setMessage(`${state.settings.defenseWord} hà nội`)}
        >
          Phòng thủ Hà Nội
        </button>
      </div>
      <div className="row">
        {(["comment", "gift", "like", "follow", "share"] as const).map((t) => (
          <button key={t} onClick={() => send(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="demo-launcher">
        <button className="secondary" disabled={Boolean(busy)} onClick={burst}>
          {busy === "demo" ? `◌ Đang trình diễn · ${demoWave || 1}/${demoTotal} sự kiện` : "▶ Trình diễn chậm: 30 người ngẫu nhiên"}
        </button>
        {busy === "demo" && (
          <div className="demo-progress" aria-label={`${demoWave}/${demoTotal} sự kiện`}>
            <i style={{ width: `${(demoWave / demoTotal) * 100}%` }} />
          </div>
        )}
      </div>
    </section>
  );
}
