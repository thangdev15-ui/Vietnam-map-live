import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
} from "tiktok-live-connector";
import type { LiveEvent } from "../shared/index";
export type TikTokSigningMode = "community" | "business";
export interface LiveAdapter {
  connect(username: string): Promise<void>;
  disconnect(): void;
  status: { state: string; username: string; error: string; attempt: number; signingMode: TikTokSigningMode };
}
export class TikTokAdapter implements LiveAdapter {
  status = { state: "disconnected", username: "", error: "", attempt: 0, signingMode: this.signingMode() };
  connection: TikTokLiveConnection | null = null;
  timer: ReturnType<typeof setTimeout> | undefined;
  generation = 0;
  constructor(private emit: (e: LiveEvent) => void) {}
  private signingMode(): TikTokSigningMode {
    return process.env.TIKTOK_SIGN_MODE?.trim().toLowerCase() === "business"
      ? "business"
      : "community";
  }
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
    const signMode = this.signingMode();
    if (signMode === "business" && !process.env.TIKTOK_SIGN_API_KEY?.trim()) {
      this.status = {
        state: "error",
        username,
        attempt: 0,
        error: "Chế độ Business cần TIKTOK_SIGN_API_KEY hợp lệ.",
        signingMode: signMode,
      };
      return;
    }
    this.status = { state: "connecting", username, error: "", attempt: 0, signingMode: signMode };
    await this.open(this.generation, signMode === "business");
  }
  private async open(gen: number, useBusinessKey = false) {
    if (gen !== this.generation) return;
    // Community signing is anonymous. Passing a key selects Euler's paid signing path.
    const c = new TikTokLiveConnection(this.status.username, {
      enableExtendedGiftInfo: true,
      ...(useBusinessKey
        ? { signApiKey: process.env.TIKTOK_SIGN_API_KEY!.trim() }
        : {}),
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
        void this.open(
          gen,
          this.signingMode() === "business",
        );
      },
      Math.min(30000, 1000 * 2 ** this.status.attempt),
    );
  }
}
