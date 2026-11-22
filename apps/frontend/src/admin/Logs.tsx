import type { AdminPanelProps } from "./types";
export function Logs({ status }: Pick<AdminPanelProps, "status">) {
  return (
    <section>
      <h2>Sự kiện gần nhất</h2>
      <div className="log-list">
        {status?.logs.map((l) => (
          <p key={l.id}>
            <b>{l.username}</b> · {l.type} <span>{l.result}</span>
            <small>{l.details}</small>
          </p>
        ))}
      </div>
      <h2>Lịch sử trận</h2>
      {status?.matches.map((m) => (
        <details key={m.id}>
          <summary>
            {new Date(m.at).toLocaleString("vi-VN")} · {m.id.slice(0, 8)}
          </summary>
          <p>Thắng: {JSON.parse(m.state).winner ?? "Hòa"}</p>
        </details>
      ))}
    </section>
  );
}
