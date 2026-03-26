import "./loadEnv";
import { createApp } from "./app";
import { prewarmJwks } from "./middleware/auth";

const app = createApp();
const PORT = process.env.PORT ?? 3001;

void prewarmJwks()
  .catch((err) => console.warn("[api] JWKS prewarm:", err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  });
