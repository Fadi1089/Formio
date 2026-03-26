process.env.PUBLIC_SUBMIT_TOKEN_SECRET = "test-public-submit-token-secret-32chars!";
process.env.TRUST_PROXY = "1";
// ≥1s so JWT `nbf` and `iat` differ in whole seconds (jose compares second resolution).
process.env.PUBLIC_SUBMIT_MIN_DELAY_MS = "1100";
