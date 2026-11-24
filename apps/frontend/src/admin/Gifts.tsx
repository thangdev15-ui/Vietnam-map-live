import type { AdminPanelProps } from "./types";
export function Gifts({
  settings,
  setSettings,
}: Pick<AdminPanelProps, "settings" | "setSettings">) {
  return (
    <section>
      <p>
        Ánh xạ theo ID hoặc tên quà nhận được. Rose là tên mẫu có thể sửa; không
        cố định giá trị kim cương.
      </p>
      {settings.gifts.map((g, i) => (
        <div className="gift-row" key={i}>
          {(["id", "name", "power"] as const).map((k) => (
            <label key={k}>
              {k}
              <input
                value={g[k]}
                type={k === "power" ? "number" : "text"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    gifts: settings.gifts.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            [k]:
                              k === "power"
                                ? Number(e.target.value)
                                : e.target.value,
                          }
                        : x,
                    ),
                  })
                }
              />
            </label>
          ))}
          <select
            aria-label="Kỹ năng"
            value={g.skill}
            onChange={(e) =>
              setSettings({
                ...settings,
                gifts: settings.gifts.map((x, j) =>
                  j === i
                    ? { ...x, skill: e.target.value as typeof g.skill }
                    : x,
                ),
              })
            }
          >
            <option value="attack">Tấn công</option>
            <option value="heal">Hồi phục</option>
            <option value="boost">Tiếp viện phe</option>
            <option value="super">Siêu thắp sáng</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={g.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  gifts: settings.gifts.map((x, j) =>
                    j === i ? { ...x, enabled: e.target.checked } : x,
                  ),
                })
              }
            />
            Bật
          </label>
          <button
            className="secondary"
            onClick={() =>
              setSettings({
                ...settings,
                gifts: settings.gifts.filter((_, j) => j !== i),
              })
            }
          >
            Xóa
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          setSettings({
            ...settings,
            gifts: [
              ...settings.gifts,
              {
                id: "new",
                name: "Quà mới",
                skill: "attack",
                power: 100,
                enabled: true,
              },
            ],
          })
        }
      >
        Thêm quà
      </button>
    </section>
  );
}
