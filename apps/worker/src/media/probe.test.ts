import { describe, expect, it } from "vitest";
import { InvalidMediaError } from "./errors.ts";
import { displayVideoArgs, posterArgs, posterTimeSeconds } from "./ffmpeg-args.ts";
import { parseProbe } from "./probe.ts";

const probe = (streams: object[], format: object = { duration: "12.345" }) =>
  JSON.stringify({ streams, format });

describe("parseProbe", () => {
  it("reads duration, size and audio", () => {
    expect(
      parseProbe(
        probe([{ codec_type: "video", width: 1920, height: 1080 }, { codec_type: "audio" }]),
      ),
    ).toEqual({ durationMs: 12345, width: 1920, height: 1080, hasAudio: true });
  });

  it("swaps the size of rotated phone videos", () => {
    const fromMatrix = parseProbe(
      probe([
        { codec_type: "video", width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] },
      ]),
    );
    expect(fromMatrix).toMatchObject({ width: 1080, height: 1920, hasAudio: false });

    const fromTag = parseProbe(
      probe([{ codec_type: "video", width: 1920, height: 1080, tags: { rotate: "270" } }]),
    );
    expect(fromTag).toMatchObject({ width: 1080, height: 1920 });

    const upsideDown = parseProbe(
      probe([
        { codec_type: "video", width: 1920, height: 1080, side_data_list: [{ rotation: 180 }] },
      ]),
    );
    expect(upsideDown).toMatchObject({ width: 1920, height: 1080 });
  });

  it("falls back to the stream duration", () => {
    expect(
      parseProbe(probe([{ codec_type: "video", width: 640, height: 480, duration: "3.5" }], {}))
        .durationMs,
    ).toBe(3500);
  });

  it("rejects files without video or duration", () => {
    expect(() => parseProbe(probe([{ codec_type: "audio" }]))).toThrow(InvalidMediaError);
    expect(() =>
      parseProbe(probe([{ codec_type: "video", width: 640, height: 480 }], { duration: "N/A" })),
    ).toThrow(InvalidMediaError);
    expect(() => parseProbe("not json")).toThrow(InvalidMediaError);
  });
});

describe("ffmpeg arguments", () => {
  it("transcodes to faststart H.264/AAC without metadata", () => {
    const args = displayVideoArgs("in.mov", "out.mp4", { hasAudio: true });
    expect(args.join(" ")).toContain("-c:v libx264");
    expect(args.join(" ")).toContain("-c:a aac");
    expect(args.join(" ")).toContain("-movflags +faststart");
    expect(args.join(" ")).toContain("-map_metadata -1");
    expect(args.at(-1)).toBe("out.mp4");
  });

  it("drops the audio track when there is none", () => {
    const args = displayVideoArgs("in.mp4", "out.mp4", { hasAudio: false });
    expect(args).toContain("-an");
    expect(args).not.toContain("0:a:0");
  });

  it("takes the poster one second in, or halfway through short clips", () => {
    expect(posterTimeSeconds(42_000)).toBe("1.000");
    expect(posterTimeSeconds(800)).toBe("0.400");
    expect(posterArgs("in.mp4", "poster.png", 42_000)).toEqual(
      expect.arrayContaining(["-ss", "1.000", "-frames:v", "1", "poster.png"]),
    );
  });
});
