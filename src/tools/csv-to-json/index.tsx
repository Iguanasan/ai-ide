// src/tools/csv-to-json/index.tsx
import React, { useMemo, useState } from 'react';

function parseCSV(text: string): string {
  // Very small CSV parser: handles quoted fields and commas/newlines.
  // For production, consider Papaparse — but keeping deps minimal here.
  const rows: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      rows.push(cur);
      cur = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (cur !== '' || rows.length) {
        rows.push(cur);
        cur = '';
      }
      if (rows.length) rows.push('\n'); // row break marker
    } else {
      cur += c;
    }
  }
  if (cur !== '' || rows.length) rows.push(cur);

  // Build array of arrays split by '\n' markers
  const table: string[][] = [];
  let row: string[] = [];
  for (const cell of rows) {
    if (cell === '\n') {
      table.push(row);
      row = [];
    } else {
      row.push(cell);
    }
  }
  if (row.length) table.push(row);

  if (table.length === 0) return '[]';

  const header = table[0];
  const out = table.slice(1).filter((r) => r.some((c) => c.trim() !== '')).map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      obj[header[i] ?? `col${i + 1}`] = r[i] ?? '';
    }
    return obj;
  });
  return JSON.stringify(out, null, 2);
}

const CsvToJson: React.FC = () => {
  const [csv, setCsv] = useState<string>('name,age\nAlice,30\nBob,28');
  const [error, setError] = useState<string | null>(null);

  const jsonOut = useMemo(() => {
    try {
      setError(null);
      return parseCSV(csv);
    } catch (e: any) {
      setError(e?.message || 'Parse error');
      return '[]';
    }
  }, [csv]);

  const download = () => {
    const blob = new Blob([jsonOut], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <h1 className="text-xl font-bold mb-2">CSV to JSON</h1>
      <p className="text-sm text-gray-600 mb-4">
        Paste CSV (first row is header). Output updates live.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">CSV</label>
          <textarea
            className="mt-1 w-full h-64 border rounded p-2 font-mono text-sm"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">JSON</label>
            <button
              onClick={download}
              className="text-sm border rounded px-2 py-1 hover:bg-gray-50"
            >
              Download
            </button>
          </div>
          <pre className="mt-1 w-full h-64 border rounded p-2 overflow-auto bg-white text-sm">
{jsonOut}
          </pre>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </div>
      </div>
    </section>
  );
};

export default CsvToJson;
