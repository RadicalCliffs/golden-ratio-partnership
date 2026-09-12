import "dotenv/config";

export interface Config {
  port: number;
  anthropicApiKey: string | undefined;
  translationModel: string;
  translationEffort: "low" | "medium" | "high" | "xhigh" | "max";
  databasePath: string;
  corsOrigins: string[];
  rateLimitPerMinute: number;
  webDist: string | undefined;
}

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const effort = (env.TRANSLATION_EFFORT ?? "low").toLowerCase();
  return {
    port: Number.parseInt(env.PORT ?? "8787", 10),
    anthropicApiKey: env.ANTHROPIC_API_KEY?.trim() || undefined,
    translationModel: env.TRANSLATION_MODEL?.trim() || "claude-opus-5",
    translationEffort: (EFFORTS as readonly string[]).includes(effort)
      ? (effort as Config["translationEffort"])
      : "low",
    databasePath: env.DATABASE_PATH?.trim() || "./data/chat.sqlite",
    corsOrigins: (env.CORS_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    rateLimitPerMinute: Number.parseInt(env.RATE_LIMIT_PER_MINUTE ?? "30", 10),
    webDist: env.WEB_DIST?.trim() || undefined,
  };
}
