import "dotenv/config";
import { createApp } from "./server";
const token = process.env.ADMIN_TOKEN;
if (!token || token.length < 24)
  throw Error("Cần ADMIN_TOKEN tối thiểu 24 ký tự trong .env");
const server = createApp(
  token,
  process.env.DATABASE_PATH ?? "data/game.sqlite",
);
server.http.listen(
  Number(process.env.PORT ?? 3001),
  process.env.HOST ?? "127.0.0.1",
  () => console.log(`Server ready http://${process.env.HOST ?? "127.0.0.1"}:${process.env.PORT ?? 3001}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
