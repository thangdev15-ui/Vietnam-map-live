import { Overview } from "./admin/Overview";
import { Live } from "./admin/Live";
import { Rules } from "./admin/Rules";
import { Gifts } from "./admin/Gifts";
import { Comments } from "./admin/Comments";
import { Players } from "./admin/Players";
import { Logs } from "./admin/Logs";
import { Simulator } from "./admin/Simulator";
import type { Status } from "./admin/types";
import { useState, useEffect } from "react";
import { api } from "./api";
import type {
  Settings,
  State,
  Province,
  LiveEvent,
} from "../../../packages/shared/index";
export function Admin({
  state,
  provinces,
}: {
  state: State;
  provinces: Province[];
}) {
  const [token, setToken] = useState("");
  const [logged, setLogged] = useState(false);
  const [tab, setTab] = useState("Tổng quan");
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [settings, setSettings] = useState<Settings>(state.settings);
  const [username, setUsername] = useState("");
  const [viewer, setViewer] = useState("chienbinh01");
  const [message, setMessage] = useState("đỏ");
  const [gift, setGift] = useState("rose");
  const [count, setCount] = useState(1);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [demoWave, setDemoWave] = useState(0);
  const [demoTotal, setDemoTotal] = useState(0);
  const [ceremony, setCeremony] = useState<"start" | "end">();
  const refresh = async () => setStatus(await api("status", token));
  useEffect(() => {
    if (!logged) return;
    let live = true;
    const timer = setInterval(() => {
      api("status", token)
        .then((s) => {
          if (live) setStatus(s);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    }, 1500);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [logged, token]);
  const run = async (
    fn: () => Promise<unknown>,
    success = "Đã thực hiện",
    task = "",
  ) => {
    setError("");
    setNotice("");
    setBusy(task);
    try {
      await fn();
      setNotice(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const showCeremony = (kind: "start" | "end") => {
    setCeremony(kind);
    window.setTimeout(() => setCeremony(undefined), 1900);
  };
  const startMatch = () =>
    run(
      async () => {
        await api("start", token, {});
        showCeremony("start");
      },
      "✦ Bình chọn bản đồ đã mở. Khán giả có 30 giây để comment chọn bản đồ.",
      "start",
    );
  const chooseMap = (map: Settings["map"]) =>
    run(
      () => api("choose-map", token, { map }),
      "✦ Đã chọn bản đồ. Đang chuẩn bị chiến trường.",
      "choose-map",
    );
  const closeVote = () =>
    run(
      () => api("close-vote", token, {}),
      "✓ Đã chốt bình chọn bản đồ.",
      "close-vote",
    );
  const pauseMatch = () => run(() => api("pause", token, {}), "Ⅱ Trận đã tạm dừng.", "pause");
  const resumeMatch = () => run(() => api("resume", token, {}), "▶ Trận đã tiếp tục.", "resume");
  const superLight = (province: string) => run(
    () => api("super-light", token, { province }),
    "☄ Siêu thắp sáng đã được kích hoạt.",
    "super-light",
  );
  const endMatch = () =>
    run(
      async () => {
        await api("end", token, {});
        showCeremony("end");
      },
      "◼ Trận đấu đã kết thúc và kết quả đã được chốt.",
      "end",
    );
  const send = async (type: LiveEvent["type"]) => {
    const id = crypto.randomUUID();
    setError("");
    setNotice("Đang xử lý sự kiện…");
    try {
      const queued = await api("events", token, [
        {
          id,
          source: "demo",
          type,
          userId: viewer,
          username: viewer,
          text: message,
          giftId: gift,
          count,
        },
      ]);
      if (queued[0] !== "queued") {
        setNotice(`Sự kiện không được xử lý: ${queued[0]}`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
      const next = await api("status", token);
      setStatus(next);
      const result = next.logs.find(
        (entry: { id: string }) => entry.id === `demo:${id}`,
      )?.result;
      const labels: Record<string, string> = {
        "Đã tham gia": `✓ ${viewer} đã tham gia. Hãy gõ tên một tỉnh/thành để thắp đèn.`,
        attack: "✓ Năng lượng đã được gửi tới thành phố đã chọn.",
        capture: "✓ Thành phố đã bừng sáng.",
        heal: "✓ Đã tiếp năng lượng cho thành phố.",
        boost: "✓ Đã thêm ánh sáng.",
        cooldown: `⏱ Hãy chờ ${Math.ceil(state.settings.cooldown / 1000)} giây rồi gửi bình luận tiếp.`,
        spam: "⚠ Người chơi đang vượt giới hạn spam.",
        "Không tìm thấy tỉnh":
          "⚠ Không tìm thấy tỉnh. Ví dụ đúng: “hà nội”.",
        "Không có lệnh phù hợp":
          "⚠ Lệnh chưa đúng. Dùng đúng tên tỉnh/thành, ví dụ “hà nội”.",
        "Hãy chọn phe trước": "⚠ Hãy bình luận tên tỉnh/thành trước.",
        "Chọn mục tiêu bằng bình luận trước":
          "⚠ Hãy gửi “hà nội” để chọn thành phố trước khi tặng quà.",
      };
      setNotice(
        labels[result ?? ""] ?? `Kết quả: ${result ?? "đã gửi sự kiện"}`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const burst = () =>
    run(async () => {
      const users = Array.from(
        { length: 30 },
        (_, i) => "bot-" + crypto.randomUUID().slice(0, 5) + "-" + i,
      );
      setDemoTotal(users.length);
      setNotice("Đang trình diễn trận mô phỏng…");
      const cities = [...provinces].sort(() => Math.random() - 0.5);
      for (let wave = 0; wave < users.length; wave++) {
        setDemoWave(wave + 1);
        await api(
          "events",
          token,
          [users[wave]].map((u) => ({
            id: crypto.randomUUID(),
            source: "demo" as const,
            type: "comment" as const,
            userId: u,
            username: u,
            text: cities[wave % cities.length].name,
            count: 1,
          })),
        );
        await new Promise((r) => setTimeout(r, 820));
      }
      setNotice("✓ Hoàn tất trình diễn 30 người chơi ngẫu nhiên.");
      window.setTimeout(() => { setDemoWave(0); setDemoTotal(0); }, 1500);
    }, "✓ Hoàn tất trình diễn 30 người chơi ngẫu nhiên.", "demo");
  if (!logged)
    return (
      <main className="login">
        <span className="eyebrow">CONTROL ROOM</span>
        <h1>Trung tâm chỉ huy</h1>
        <p>Nhập TIKTOK KEY CONNECT của máy chủ.</p>
        <input
          aria-label="Admin token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button
          onClick={() =>
            run(async () => {
              await refresh();
              setSettings(state.settings);
              setLogged(true);
            })
          }
        >
          Đăng nhập
        </button>
        <p role="alert">{error}</p>
        <a href="/">← Trở về chiến trường</a>
      </main>
    );
  const numeric = (key: keyof Settings, label: string) => (
    <label key={key}>
      {label}
      <input
        type="number"
        value={Number(settings[key])}
        onChange={(e) =>
          setSettings({ ...settings, [key]: Number(e.target.value) })
        }
      />
    </label>
  );
  return (
    <div className="admin">
      <aside>
        <a href="/" className="brand">
          VN<span> / ĐẠI CHIẾN</span>
        </a>
        <p className="eyebrow">TRUNG TÂM CHỈ HUY</p>
        {[
          "Tổng quan",
          "TikTok LIVE",
          "Luật trận đấu",
          "Quà tặng",
          "Bình luận",
          "Người chơi",
          "Nhật ký",
          "Mô phỏng",
        ].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => {
            setToken("");
            setLogged(false);
          }}
        >
          Đăng xuất
        </button>
        <a href="/?broadcast=1" target="_blank">
          Mở Broadcast ↗
        </a>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">ĐIỀU HÀNH / {tab.toUpperCase()}</span>
            <h1>{tab}</h1>
          </div>
          <span className="badge">
            {state.phase} • {status?.tiktok.state}
          </span>
        </header>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="admin-toast success">
            {notice}
          </p>
        )}
        {ceremony && (
          <div className={`command-ceremony ${ceremony}`} role="status">
            <span>{ceremony === "start" ? "✦" : "◼"}</span>
            <strong>{ceremony === "start" ? "BÌNH CHỌN BẢN ĐỒ ĐÃ MỞ" : "TRẬN ĐẤU ĐÃ KẾT THÚC"}</strong>
            <small>{ceremony === "start" ? "Khán giả có 30 giây để comment chọn bản đồ" : "Kết quả đã được chốt"}</small>
          </div>
        )}
        {tab === "Tổng quan" && (
          <Overview state={state} status={status} startMatch={startMatch} endMatch={endMatch} chooseMap={chooseMap} closeVote={closeVote} pauseMatch={pauseMatch} resumeMatch={resumeMatch} busy={busy} />
        )}
        {tab === "TikTok LIVE" && (
          <Live
            username={username}
            setUsername={setUsername}
            status={status}
            run={run}
            token={token}
          />
        )}
        {tab === "Luật trận đấu" && (
          <Rules
            settings={settings}
            setSettings={setSettings}
            numeric={numeric}
          />
        )}
        {tab === "Quà tặng" && (
          <Gifts settings={settings} setSettings={setSettings} />
        )}
        {tab === "Bình luận" && (
          <Comments
            settings={settings}
            setSettings={setSettings}
            numeric={numeric}
          />
        )}
        {["Luật trận đấu", "Quà tặng", "Bình luận"].includes(tab) && (
          <button onClick={() => run(() => api("settings", token, settings))}>
            Lưu cấu hình (ngoài trận)
          </button>
        )}
        {tab === "Người chơi" && (
          <Players
            search={search}
            setSearch={setSearch}
            status={status}
            run={run}
            token={token}
          />
        )}
        {tab === "Nhật ký" && <Logs status={status} />}
        {tab === "Mô phỏng" && (
          <Simulator
            state={state}
            viewer={viewer}
            setViewer={setViewer}
            message={message}
            setMessage={setMessage}
            gift={gift}
            setGift={setGift}
            count={count}
            setCount={setCount}
            send={send}
            burst={burst}
            superLight={superLight}
            busy={busy}
            demoWave={demoWave}
            demoTotal={demoTotal}
          />
        )}
      </main>
    </div>
  );
}
