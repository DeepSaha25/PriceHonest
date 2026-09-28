import { Router, Request, Response } from "express";
import { sanitizeProductQuery } from "../services/validation";

const router = Router();

function parseHttpUrl(input: string): URL | null {
  try {
    const parsed = new URL(input);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function detectPlatform(input: string): string {
  const parsed = parseHttpUrl(input);
  const host = parsed?.hostname.toLowerCase() ?? "";
  if (/amazon\.(in|com)$/.test(host)) return "amazon";
  if (host === "flipkart.com" || host.endsWith(".flipkart.com"))
    return "flipkart";
  if (host === "myntra.com" || host.endsWith(".myntra.com")) return "myntra";
  if (host === "meesho.com" || host.endsWith(".meesho.com")) return "meesho";
  if (host === "snapdeal.com" || host.endsWith(".snapdeal.com"))
    return "snapdeal";
  if (host === "croma.com" || host.endsWith(".croma.com")) return "croma";
  if (host === "reliancedigital.in" || host.endsWith(".reliancedigital.in"))
    return "reliance";
  return "generic";
}

function slugToTitle(slug: string): string {
  return (
    decodeURIComponent(slug)
      .replace(/\.(?:html?|aspx?)$/i, "")
      .replace(/[-_]+/g, " ")
      // Common Sony headphone slugs split WH-1000XM5 at the URL boundary;
      // restore that model separator rather than weakening product identity.
      .replace(/\b(wh|wf)\s+(?=\d)/gi, "$1-")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function identifierOnly(value: string): boolean {
  // Readable slugs such as "Sony WH 1000XM5" contain digits but are not IDs.
  if (/\s/.test(value)) return false;
  const normalized = value.replace(/[-_]/g, "");
  return (
    /^[a-z0-9]{6,}$/i.test(normalized) &&
    /\d/.test(normalized) &&
    !/[aeiou]{2}/i.test(normalized)
  );
}

export function extractQueryFromUrl(
  rawUrl: string,
  platform = detectPlatform(rawUrl),
): string | null {
  const parsed = parseHttpUrl(rawUrl);
  if (!parsed) return null;
  if (
    /^(?:www\.)?(?:amzn\.to|bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly)$/i.test(
      parsed.hostname,
    )
  )
    return null;
  const parts = parsed.pathname.split("/").filter(Boolean);
  let candidate = "";
  if (platform === "amazon") {
    const dpIndex = parts.findIndex((part) => part.toLowerCase() === "dp");
    if (dpIndex > 0) candidate = slugToTitle(parts[dpIndex - 1]);
    if (!candidate && dpIndex >= 0 && dpIndex + 1 < parts.length)
      candidate = slugToTitle(parts[dpIndex + 1]);
    if (!candidate)
      candidate =
        parsed.searchParams.get("k") ??
        parsed.searchParams.get("field-keywords") ??
        "";
  } else if (platform === "flipkart") {
    const pIndex = parts.findIndex((part) => part.toLowerCase() === "p");
    if (pIndex > 0) candidate = slugToTitle(parts[pIndex - 1]);
  } else if (platform === "myntra") {
    if (parts.length >= 2 && parts.some((part) => part.toLowerCase() === "buy"))
      candidate = `${slugToTitle(parts[0])} ${slugToTitle(parts[1])}`;
  } else {
    const reserved = new Set([
      "p",
      "product",
      "products",
      "buy",
      "dp",
      "item",
      "details",
    ]);
    const candidatePart = [...parts]
      .reverse()
      .find(
        (part) =>
          !reserved.has(part.toLowerCase()) &&
          !/^\d+$/.test(part) &&
          !/^p?\d+[a-z0-9]+$/i.test(part),
      );
    candidate = candidatePart ? slugToTitle(candidatePart) : "";
  }
  const cleaned = sanitizeProductQuery(candidate);
  if (!cleaned || cleaned.length < 3 || identifierOnly(cleaned)) return null;
  return cleaned;
}

router.post("/", (req: Request, res: Response) => {
  try {
    const input = (req.body as { input?: unknown } | undefined)?.input;
    if (typeof input !== "string" || !input.trim())
      return res.status(400).json({ error: "Input is required" });
    const trimmed = input.trim();
    const asUrl = parseHttpUrl(trimmed);
    if (asUrl) {
      const platform = detectPlatform(trimmed);
      const productQuery = extractQueryFromUrl(trimmed, platform);
      if (!productQuery) {
        return res.status(422).json({
          error:
            "This URL does not contain a readable product name. Paste the product name or a full product-page URL instead.",
        });
      }
      return res.json({ productQuery, sourceUrl: trimmed, platform });
    }
    if (/^(?:https?:\/\/|www\.)/i.test(trimmed)) {
      return res.status(422).json({
        error:
          "Only a full HTTP(S) product-page URL is supported; short or identifier-only URLs cannot be resolved safely.",
      });
    }
    const productQuery = sanitizeProductQuery(trimmed);
    if (productQuery.length < 2)
      return res.status(422).json({
        error: "Provide a product name or model, not only a short identifier.",
      });
    return res.json({ productQuery });
  } catch {
    return res.status(422).json({
      error:
        "Unable to resolve that input safely. Provide a product name or full product-page URL.",
    });
  }
});

export { identifierOnly };
export default router;
