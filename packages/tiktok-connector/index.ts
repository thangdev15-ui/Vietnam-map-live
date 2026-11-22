import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
} from "tiktok-live-connector";
import type { LiveEvent } from "../shared/index";
export interface LiveAdapter {
  connect(username: string): Promise<void>;
  disconnect(): void;
  status: { state: string; username: string; error: string; attempt: number };
}
export class TikTokAdapter implements LiveAdapter {
  status = { state: "disconnected", username: "", error: "", attempt: 0 };
  connection: TikTokLiveConnection | null = null;
  timer: ReturnType<typeof setTimeout> | undefined;
  generation = 0;
  constructor(private emit: (e: LiveEvent) => void) {}
  disconnect() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.connection?.removeAllListeners();
    this.connection?.disconnect();
    this.connection = null;
    this.status.state = "disconnected";
  }
  async connect(username: string) {
    this.disconnect();
    if (!process.env.TIKTOK_SIGN_API_KEY?.trim()) {
      this.status = {
        state: "error",
        username,
        attempt: 0,
        error:
          "Thiếu TIKTOK_SIGN_API_KEY. Thư viện cần khóa Euler Stream để ký kết nối TikTok.",
      };
      return;
    }
    this.status = { state: "connecting", username, error: "", attempt: 0 };
    await this.open(this.generation);
  }
  private async open(gen: number) {
    if (gen !== this.generation) return;
    const c = new TikTokLiveConnection(this.status.username, {
      enableExtendedGiftInfo: true,
      signApiKey: process.env.TIKTOK_SIGN_API_KEY,
    });
    this.connection = c;
    const receive = (type: LiveEvent["type"]) => (d: any) => {
      if (gen !== this.generation) return;
      if (
        type === "gift" &&
        (d.giftDetails?.giftType ?? d.giftType) === 1 &&
        !d.repeatEnd
      )
        return;
      const uid = d.user?.userId ?? d.userId ?? d.user?.uniqueId ?? d.uniqueId;
      if (!uid) return;
      const id = String(d.msgId ?? d.common?.msgId ?? "");
      if (!id) {
        this.status.error = "Bỏ qua sự kiện không có msgId để tránh trùng";
        return;
      }
      try {
        this.emit({
          id,
          type,
          source: "tiktok",
          userId: String(uid),
          username: String(d.user?.uniqueId ?? d.uniqueId ?? "viewer"),
          avatar:
            d.user?.avatarThumb?.urlList?.[0] ??
            d.user?.avatarMedium?.urlList?.[0] ??
            d.user?.profilePicture?.urlList?.[0] ??
            d.user?.profilePictureUrl,
          text: d.comment,
          giftId: d.giftId === undefined ? undefined : String(d.giftId),
          giftName:
            d.giftName ?? d.giftDetails?.giftName ?? d.extendedGiftInfo?.name,
          count: Math.max(
            1,
            Math.min(10000, Number(d.repeatCount ?? d.likeCount ?? 1)),
          ),
        });
      } catch {
        this.status.error = "Sự kiện không hợp lệ hoặc hàng đợi đầy";
      }
    };
    c.on(WebcastEvent.CHAT, receive("comment"));
    c.on(WebcastEvent.GIFT, receive("gift"));
    c.on(WebcastEvent.LIKE, receive("like"));
    c.on(WebcastEvent.FOLLOW, receive("follow"));
    c.on(WebcastEvent.SHARE, receive("share"));
    c.on(ControlEvent.ERROR, () => {
      this.status.error = "TikTok báo lỗi kết nối; xem trạng thái và thử lại.";
    });
    c.on(ControlEvent.DISCONNECTED, () => this.retry(gen));
    c.on(WebcastEvent.STREAM_END, () => {
      this.disconnect();
      this.status.state = "ended";
    });
    try {
      await c.connect();
      if (gen !== this.generation) {
        c.disconnect();
        return;
      }
      this.status.state = "connected";
      this.status.attempt = 0;
      this.status.error = "";
    } catch (error) {
      if (gen !== this.generation) return;
      const detail = error instanceof Error ? error.message : "Lỗi không xác định";
      this.status.error =
        `Không kết nối được LIVE: ${detail.slice(0, 240)}`;
      this.retry(gen);
    }
  }
  private retry(gen: number) {
    if (gen !== this.generation || this.timer) return;
    this.connection?.removeAllListeners();
    this.connection?.disconnect();
    this.status.attempt++;
    if (this.status.attempt > 5) {
      this.status.state = "error";
      return;
    }
    this.status.state = "reconnecting";
    this.timer = setTimeout(
      () => {
        this.timer = undefined;
        void this.open(gen);
      },
      Math.min(30000, 1000 * 2 ** this.status.attempt),
    );
  }
}
