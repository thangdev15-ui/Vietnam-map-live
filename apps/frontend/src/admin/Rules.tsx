import type { AdminPanelProps } from "./types";
import type { Settings } from "../../../../packages/shared/index";
export function Rules({
  settings,
  setSettings,
  numeric,
}: Pick<AdminPanelProps, "settings" | "setSettings" | "numeric">) {
  return (
    <section>
      <h2>Thông số trận tiếp theo</h2>
      <div className="form-grid">
        <label>
          Bản đồ
          <select
            value={settings.map}
            onChange={(e) =>
              setSettings({
                ...settings,
                map: e.target.value as Settings["map"],
              })
            }
          >
            <option value="historical63">63 tỉnh • lịch sử</option>
            <option value="merged34">34 vùng • gộp dữ liệu lịch sử</option>
          </select>
        </label>
        {(
          [
            ["duration", "Thời gian (giây)"],
            ["hp", "Máu tối đa"],
            ["attack", "Sức tấn công"],
            ["defense", "Sức phòng thủ"],
            ["counter", "Tỷ lệ phản công (0–1)"],
            ["regen", "Hồi máu mỗi giây"],
            ["winPercent", "Tỷ lệ chiếm để thắng (%)"],
          ] as [keyof Settings, string][]
        ).map(([k, l]) => numeric(k, l))}
      </div>
      <h2>Các phe</h2>
      {settings.teams.map((t, i) => (
        <div className="row" key={t.id}>
          <input
            aria-label="Tên phe"
            value={t.name}
            onChange={(e) =>
              setSettings({
                ...settings,
                teams: settings.teams.map((x, j) =>
                  j === i ? { ...x, name: e.target.value } : x,
                ),
              })
            }
          />
          <input
            aria-label="Màu phe"
            type="color"
            value={t.color}
            onChange={(e) =>
              setSettings({
                ...settings,
                teams: settings.teams.map((x, j) =>
                  j === i ? { ...x, color: e.target.value } : x,
                ),
              })
            }
          />
          <button
            className="secondary"
            onClick={() =>
              setSettings({
                ...settings,
                teams: settings.teams.filter((_, j) => j !== i),
              })
            }
          >
            Xóa
          </button>
        </div>
      ))}
      <button
        className="secondary"
        onClick={() =>
          setSettings({
            ...settings,
            teams: [
              ...settings.teams,
              {
                id: "team-" + Date.now(),
                name: "Phe mới",
                color: "#a78bfa",
                keyword: "tim",
              },
            ],
          })
        }
      >
        Thêm phe
      </button>
    </section>
  );
}
