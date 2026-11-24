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
          Bản đồ chiến trường mặc định
          <select
            value={settings.map}
            onChange={(e) =>
              setSettings({
                ...settings,
                map: e.target.value as Settings["map"],
              })
            }
          >
            <option value="vietnam">Việt Nam • 63 tỉnh, thành</option>
            <option value="southeast-asia">Đông Nam Á • 11 quốc gia</option>
            <option value="world">Thế giới • 242 quốc gia/vùng</option>
          </select>
        </label>
        <label>
          Dữ liệu Việt Nam
          <select value={settings.vietnamVariant} onChange={(e) => setSettings({ ...settings, vietnamVariant: e.target.value as Settings["vietnamVariant"] })}>
            <option value="historical63">63 tỉnh, thành lịch sử</option>
            <option value="merged34">34 tỉnh, thành hiện hành</option>
          </select>
        </label>
        {(
          [
            ["votingDuration", "Thời gian bình chọn bản đồ (giây)"],
            ["comboWindow", "Thời gian giữ combo (giây)"],
            ["comboThreshold", "Số lượt để đạt combo"],
            ["comboBonus", "Điểm thưởng mỗi mốc combo"],
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
      <label className="map-options">
        Bản đồ cho phép bình chọn
        <span>
          {(["vietnam", "southeast-asia", "world"] as const).map((map) => (
            <button
              type="button"
              className={settings.activeMaps.includes(map) ? "selected" : "secondary"}
              key={map}
              onClick={() => {
                const activeMaps = settings.activeMaps.includes(map)
                  ? settings.activeMaps.filter((item) => item !== map)
                  : [...settings.activeMaps, map];
                if (activeMaps.length) setSettings({ ...settings, activeMaps });
              }}
            >
              {map === "vietnam" ? "MAP 1 · Việt Nam" : map === "southeast-asia" ? "MAP 2 · Đông Nam Á" : "MAP 3 · Thế giới"}
            </button>
          ))}
        </span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={settings.lightSpread}
          onChange={(e) => setSettings({ ...settings, lightSpread: e.target.checked })}
        />
        Hiệu ứng ánh sáng lan tỏa sang các vùng lân cận khi một tỉnh được thắp sáng
      </label>
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
