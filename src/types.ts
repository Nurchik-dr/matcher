export type MappingRow = {
  _id: string;
  id: string;
  product_id: string;
  title: string;
  brand: string | null;
  matched_csv_title: string | null;
  match_confidence: number;
  best_match: "match" | "no_match" | string;

  // опционально: сюда будем писать cosine-similarity из embedding-скрипта
  semantic_score?: number;

  [key: string]: unknown;
};

export type StatusType = "correct" | "neutral" | "wrong";

export type ClassifiedRow = {
  row: MappingRow;
  status: StatusType;
  reason: string;
  volumeActual: number | null;
  volumeExpected: number | null;
  percentActual: number | null;
  percentExpected: number | null;
};
