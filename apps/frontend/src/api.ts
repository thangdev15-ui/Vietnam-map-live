export async function api(path: string, token: string, body?: unknown) {
  const r = await fetch("/api/admin/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await r.json();
  if (!r.ok) throw Error(value.error ?? "Yêu cầu thất bại");
  return value;
}
