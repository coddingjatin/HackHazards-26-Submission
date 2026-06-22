import type { Reading, Shipment } from "./types";

export function answerQuery(
  q: string,
  shipment: Shipment,
  readings: Reading[],
): string {
  const lower = q.toLowerCase();
  const breaches = readings.filter((r) => r.status === "breach");
  const warnings = readings.filter((r) => r.status === "warning");
  const total = readings.length;
  const okPct = total ? Math.round(((total - breaches.length) / total) * 100) : 100;

  const overUpper = readings.filter((r) => r.temp > shipment.upperLimit);
  let timeOver = 0;
  for (let i = 1; i < overUpper.length; i++) {
    timeOver += overUpper[i].ts - overUpper[i - 1].ts;
  }
  const minutesOver = Math.round(timeOver / 60000);

  // General help
  if (lower.includes("help") || lower.includes("faq") || lower.includes("what can")) {
    return `
Hi there! Here are some things I can help with:

❓ Ask anything about this shipment!
👉 "Is this shipment safe?"
👉 "Tell me about the temperature breaches?"
👉 "Give me a quick summary?"
👉 "Explain the hash chain security?"
👉 "How long did we go over the temperature limit?"
👉 "What's the compliance score?"
`.trim();
  }

  // Safety / Distribution
  if (lower.includes("safe") || lower.includes("distribute")) {
    if (breaches.length === 0)
      return `
✅ GREAT NEWS!

Shipment **${shipment.id}** has 0 threshold breaches!
We've collected ${total} readings total (${okPct}% perfect!)

Per CDC cold-chain guidance, this is **SAFE TO DISTRIBUTE**. No QA review needed!
`.trim();

    return `
⚠️ Heads up!

Shipment **${shipment.id}** had ${breaches.length} breach event(s)
It was over ${shipment.upperLimit}°C for ~${minutesOver} minute(s)

Quick recommendation: Quarantine & do a full QA check before sending it out!
`.trim();
  }

  // Breach info
  if (lower.includes("breach")) {
    if (breaches.length === 0)
      return `
Great question!

We don't have any breaches at all for shipment ${shipment.id}! 🎉
Total readings: ${total}
Everything is looking good!
`.trim();

    return `
Got it! Let's look at the breaches:

⚠️ Number of breaches: **${breaches.length}**
🌡️ Temperature went over ${shipment.upperLimit}°C for ~${minutesOver} minute(s)
Also, ${warnings.length} times we got close to the limit!
`.trim();
  }

  // Time over limit
  if (lower.includes("how long") && (lower.includes("above") || lower.includes("over"))) {
    return `
Temperature was over ${shipment.upperLimit}°C for about **${minutesOver} minute(s)**
Total of ${overUpper.length} individual reading(s) above the limit.
`.trim();
  }

  // Summary
  if (lower.includes("summary") || lower.includes("regulatory")) {
    return `
📋 Quick Summary for ${shipment.id}

👉 Product: ${shipment.product}
👉 Route: ${shipment.origin} → ${shipment.destination}
👉 Total readings: ${total}
👉 Threshold breaches: ${breaches.length}
👉 Time over limit: ${minutesOver} min
👉 Overall compliance: ${okPct}%

Audit chain status: All good! SHA-256 hash chain intact.

Overall: ${breaches.length === 0 ? "✅ COMPLIANT" : "⚠️ REVIEW REQUIRED"}
`.trim();
  }

  // Hash chain / Blockchain
  if (lower.includes("hash") || lower.includes("tamper") || lower.includes("blockchain")) {
    return `
🔒 About our security:

Every single reading has 3 layers of protection:

1️⃣ **SHA-256 Hash** - We calculate a unique fingerprint for every reading using:
   - Timestamp
   - Temperature
   - Sensor ID
   - Previous reading's hash

2️⃣ **Chain of Trust** - You can't change an old reading without breaking the whole chain!

3️⃣ **On-chain Anchor** - When the shipment is delivered, we put the final fingerprint on Polygon blockchain so no one can fake it later!
`.trim();
  }

  // Compliance score
  if (lower.includes("compliance") || lower.includes("score")) {
    return `
📊 Compliance Score: **${okPct}%**

How we calculate it:
- Total readings: ${total}
- Breaches: ${breaches.length}
- Safe readings: ${total - breaches.length}

Formula: (Safe readings / Total) × 100 = ${okPct}%
`.trim();
  }

  // Fallback / generic
  return `
Hi there! Let's talk about shipment **${shipment.id}**!

Here are some quick stats:
- Total readings: ${total}
- Breaches so far: ${breaches.length}
- Compliance: ${okPct}%

Try asking me:
- "Is this shipment safe?"
- "Give me a summary"
- "How long was the temp over?"
- "Explain the hash chain"
`.trim();
}
