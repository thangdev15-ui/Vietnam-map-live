import type { AdminPanelProps } from "./types";
export function Comments({
  settings,
  setSettings,
  numeric,
}: Pick<AdminPanelProps, "settings" | "setSettings" | "numeric">) {
  return (
    <section>
      <div className="form-grid">
        {(["attackWord", "defenseWord"] as const).map((k) => (
          <label key={k}>
            {k === "attackWord" ? "Từ khóa tấn công" : "Từ khóa phòng thủ"}
            <input
              value={settings[k]}
              onChange={(e) =>
                setSettings({ ...settings, [k]: e.target.value })
              }
            />
          </label>
        ))}
        {numeric("cooldown", "Cooldown bình luận (ms)")}
        {numeric("spamLimit", "Sự kiện / người / phút")}
        {settings.teams.map((t, i) => (
          <label key={t.id}>
            Tham gia {t.name}
            <input
              value={t.keyword}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  teams: settings.teams.map((x, j) =>
                    j === i ? { ...x, keyword: e.target.value } : x,
                  ),
                })
              }
            />
          </label>
        ))}
      </div>
      <h2>Loại sự kiện</h2>
      {Object.entries(settings.enabled).map(([k, v]) => (
        <label className="check" key={k}>
          <input
            type="checkbox"
            checked={v}
            onChange={(e) =>
              setSettings({
                ...settings,
                enabled: { ...settings.enabled, [k]: e.target.checked },
              })
            }
          />
          {k}
        </label>
      ))}
    </section>
  );
}
