// scripts/enrich-semantic.ts
import fs from "fs";
import OpenAI from "openai";

type MappingRow = {
  title: string;
  matched_csv_title: string | null;
  semantic_score?: number;
  [key: string]: unknown;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const cosine = (a: number[], b: number[]): number => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

async function main() {
  const raw = fs.readFileSync("src/mapped.json", "utf8");
  const rows: MappingRow[] = JSON.parse(raw);

  const inputs: string[] = [];
  for (const r of rows) {
    inputs.push(`ACTUAL: ${r.title}`);
    inputs.push(`CSV: ${r.matched_csv_title ?? ""}`);
  }

  const resp = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: inputs,
  });

  let idx = 0;
  for (const r of rows) {
    const embA = resp.data[idx++].embedding;
    const embB = resp.data[idx++].embedding;
    r.semantic_score = cosine(embA as number[], embB as number[]);
  }

  fs.writeFileSync("src/mapped.json", JSON.stringify(rows, null, 2));
  console.log("OK, semantic_score записан в src/mapped.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
