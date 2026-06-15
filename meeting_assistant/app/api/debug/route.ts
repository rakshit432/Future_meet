import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const cmd = searchParams.get("cmd");

  if (action === "read_log") {
    try {
      const logPath = path.resolve("../backend/backend.log");
      if (!fs.existsSync(logPath)) {
        return NextResponse.json({ error: `Log file not found at ${logPath}` }, { status: 404 });
      }
      
      const buffer = fs.readFileSync(logPath);
      // Try to decode as UTF-16LE
      const content = buffer.toString("utf16le");
      const lines = content.split("\n");
      const lastLines = lines.slice(-150).join("\n");
      
      return new NextResponse(lastLines, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === "exec" && cmd) {
    return new Promise<Response>((resolve) => {
      exec(cmd, { cwd: path.resolve("../backend") }, (error, stdout, stderr) => {
        resolve(NextResponse.json({
          error: error ? error.message : null,
          stdout,
          stderr
        }));
      });
    });
  }

  return NextResponse.json({ message: "Debug endpoint active. Use ?action=read_log or ?action=exec&cmd=..." });
}
