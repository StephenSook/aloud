import { describe, it, expect, vi } from "vitest";
import { stopScanner } from "@/lib/scanner-teardown";

describe("stopScanner", () => {
  it("does not throw when stop() throws a synchronous string (the iOS boundary bug)", async () => {
    // html5-qrcode's real stop() throws this exact string when not scanning.
    const clear = vi.fn();
    const scanner = {
      stop: () => {
        throw "Cannot stop, scanner is not running or paused.";
      },
      clear,
    } as unknown as { stop: () => Promise<void>; clear: () => void };

    await expect(stopScanner(scanner)).resolves.toBeUndefined();
    // teardown continues to clear() even though stop() threw
    expect(clear).toHaveBeenCalledOnce();
  });

  it("does not throw when stop() returns a rejected promise", async () => {
    const clear = vi.fn();
    const scanner = {
      stop: () => Promise.reject(new Error("boom")),
      clear,
    };
    await expect(stopScanner(scanner)).resolves.toBeUndefined();
    expect(clear).toHaveBeenCalledOnce();
  });

  it("stops then clears on the normal path", async () => {
    const order: string[] = [];
    const scanner = {
      stop: vi.fn(async () => {
        order.push("stop");
      }),
      clear: vi.fn(() => {
        order.push("clear");
      }),
    };
    await stopScanner(scanner);
    expect(order).toEqual(["stop", "clear"]);
  });

  it("swallows a throw from clear()", async () => {
    const scanner = {
      stop: async () => undefined,
      clear: () => {
        throw "region already torn down";
      },
    } as unknown as { stop: () => Promise<void>; clear: () => void };
    await expect(stopScanner(scanner)).resolves.toBeUndefined();
  });

  it("is a no-op for a null scanner", async () => {
    await expect(stopScanner(null)).resolves.toBeUndefined();
  });
});
