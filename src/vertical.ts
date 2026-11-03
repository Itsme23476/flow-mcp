import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { FFMPEG_HINT } from "./platform.js";

const run = promisify(execFile);
const FFMPEG = process.env.FLOW_MCP_FFMPEG ?? "ffmpeg";

// 1080x1920 for Shorts, Reels and TikTok, made on this computer from a wide film: nothing is regenerated in Flow.
// ponytail: centre crop only, no subject tracking; add detection when people need off-centre subjects kept in frame.
const FILTERS = {
  blur: "[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:2[bg];[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]",
  crop: "[0:v]scale=-2:1920,crop=1080:1920,setsar=1[v]",
};

export async function vertical(video: string, mode: keyof typeof FILTERS, output: string): Promise<{ output: string; mode: string; size: string }> {
  if (!existsSync(video)) throw new Error(`Video not found: ${video}`);
  try {
    await run(FFMPEG, ["-y", "-i", video, "-filter_complex", FILTERS[mode], "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", output], { maxBuffer: 1 << 26 });
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    throw new Error(e.code === "ENOENT" ? `ffmpeg is not installed (${FFMPEG_HINT}).` : `ffmpeg failed: ${(e.stderr ?? String(e)).slice(-600)}`);
  }
  return { output, mode, size: "1080x1920" };
}
