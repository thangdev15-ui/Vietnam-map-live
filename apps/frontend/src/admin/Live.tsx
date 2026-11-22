import type { AdminPanelProps } from "./types";
import { api } from "../api";
export function Live({
  username,
  setUsername,
  status,
  run,
  token,
}: Pick<
  AdminPanelProps,
  "username" | "setUsername" | "status" | "run" | "token"
>) {
  return (
    <section>
      <h2>Kết nối phiên phát</h2>
      <p>
        Adapter không chính thức • Chỉ hiển thị connected sau khi thư viện kết
        nối thành công.
      </p>
      <label>
        Username LIVE
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
        />
      </label>
      <button onClick={() => run(() => api("connect", token, { username }))}>
        Kết nối
      </button>
      <button
        className="secondary"
        onClick={() => run(() => api("disconnect", token, {}))}
      >
        Ngắt kết nối
      </button>
      <p>
        {status?.tiktok.state} {status?.tiktok.username}
      </p>
      <p className="error">{status?.tiktok.error}</p>
      <p>
        Cần đặt TIKTOK_SIGN_API_KEY trong file .env rồi khởi động lại server.
        Không nhập mật khẩu hoặc cookie TikTok vào game.
      </p>
    </section>
  );
}
