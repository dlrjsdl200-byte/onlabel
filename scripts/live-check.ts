/**
 * Live end-to-end check of the OnLabel agent pipeline (calls Claude).
 * Requires ANTHROPIC_API_KEY.
 * Run: npm run check:live
 */
import { runOnLabel } from "../src/lib/onlabel/agent";

const question =
  process.argv.slice(2).join(" ") ||
  "I have a bad cold. Can I take Tylenol Extra Strength together with DayQuil?";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Put it in .env and retry.");
    process.exit(1);
  }
  console.log(`Q: ${question}\n`);
  const res = await runOnLabel(question);
  console.log("=== ANSWER ===");
  console.log(res.answer);
  console.log("\n=== PRODUCTS CHECKED ===");
  console.log(res.productsChecked.join(", ") || "(none)");
  console.log("\n=== DETERMINISTIC VERDICT ===");
  console.log(res.verification ? res.verification.overall.toUpperCase() : "(no products checked)");
}

main().catch((err) => {
  console.error("Live check failed:", err);
  process.exit(1);
});
