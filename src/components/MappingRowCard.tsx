import { useState } from "react";
import type { ClassifiedRow } from "../types";

export const MappingRowCard = ({ data }: { data: ClassifiedRow }) => {
    const { row, status, reason, volumeActual, volumeExpected, percentActual, percentExpected } = data;

    const unmapped = !row.matched_csv_title?.trim();
    const productId = row.product_id || row.id || row._id;
    const [copied, setCopied] = useState(false);

    const copyId = () => {
        navigator.clipboard.writeText(String(productId));
        setCopied(true);
        setTimeout(() => setCopied(false), 800);
    };

    return (
        <div className="row-card">
            <div className="row-main">
                <div className="titles">
                    <div className="title-block">
                        <span className="title-label">Фактическое название</span>
                        <div className="title-value">{row.title}</div>
                    </div>

                    <div className="title-block">
                        <span className="title-label">Замапленное название (CSV)</span>
                        <div className="title-value alt">
                            {row.matched_csv_title || <span className="muted">—</span>}
                        </div>
                    </div>
                </div>

                <div className="status-block">
                    {unmapped ? (
                        <span className="status-pill" style={{ background: "#fbbf24" }}>Не замаплен</span>
                    ) : (
                        <span className="status-pill" style={{ background: status === "correct" ? "#34d399" : "#ef4444" }}>
                            {status === "correct" ? "Правильный" : "Неправильный"}
                        </span>
                    )}
                    <div className="status-reason">{reason}</div>
                </div>
            </div>

            <div className="row-extra">
                <div className="meta">
                    <span className="meta-label">Product ID:</span>
                    <span className="meta-value">{productId}</span>
                    <button className="copy-btn" onClick={copyId}>
                        {copied ? "✓ скопировано" : "📋"}
                    </button>
                </div>

                <div className="meta">
                    <span className="meta-label">Объём</span>
                    <span className="meta-value">
                        {volumeActual ?? "Не указан"} → {volumeExpected ?? "Не указан"}
                    </span>
                </div>


                <div className="meta">
                    <span className="meta-label">Процент</span>
                    <span className="meta-value">
                        {percentActual !== null ? `${percentActual}%` : "Не указан"} →{" "}
                        {percentExpected !== null ? `${percentExpected}%` : "Не указан"}
                    </span>
                </div>

            </div>
        </div>
    );
};
