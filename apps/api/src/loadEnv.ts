import path from "path";
import dotenv from "dotenv";

// `.env.local` is the usual local-dev file (mirrors Next.js); `.env` fills any missing keys.
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });
