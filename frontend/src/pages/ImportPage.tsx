import { useState } from 'react';
import { commitImport, previewImport } from '../api/client';
import { ImportPreviewResponse } from '../types';

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Название сделки' },
  { key: 'budget', label: 'Бюджет ₽' },
];

const OPTIONAL_FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'manager', label: 'Ответственный' },
  { key: 'createdAt', label: 'Дата создания сделки' },
  { key: 'closedAt', label: 'Дата закрытия сделки' },
];

type MappingState = Record<string, string>;

export default function ImportPage() {
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<MappingState>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setLoading(true);
    try {
      const data = await previewImport(file);
      setPreview(data);
      setMapping({});
    } catch (error) {
      console.error(error);
      setStatus('Не удалось обработать файл. Проверьте формат CSV.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    for (const field of REQUIRED_FIELDS) {
      if (!mapping[field.key]) {
        setStatus(`Поле «${field.label}» обязательно к сопоставлению`);
        return;
      }
    }
    setLoading(true);
    try {
      const result = await commitImport({
        sessionId: preview.sessionId,
        mapping: mapping as any,
      });
      setStatus(`Импортировано записей: ${result.imported}`);
      setPreview(null);
      setMapping({});
    } catch (error) {
      console.error(error);
      setStatus('Ошибка при сохранении данных.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1 className="section-title">Импорт CSV из amoCRM</h1>
      <p className="no-print">
        Загрузите CSV-файл в кодировке UTF-8. Приложение автоматически определит разделитель
        запятыми или точкой с запятой. В предпросмотр попадают первые 50 строк.
      </p>
      <input type="file" accept=".csv" onChange={handleFileChange} disabled={loading} />
      {status && <p>{status}</p>}
      {preview && (
        <div>
          <h2 className="section-title">Сопоставление полей</h2>
          <div className="flex" style={{ flexWrap: 'wrap' }}>
            {REQUIRED_FIELDS.map((field) => (
              <label key={field.key} style={{ display: 'flex', flexDirection: 'column', minWidth: 240 }}>
                {field.label}*
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(event) =>
                    setMapping((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                >
                  <option value="">— выберите колонку —</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex" style={{ flexWrap: 'wrap', marginTop: 16 }}>
            {OPTIONAL_FIELDS.map((field) => (
              <label key={field.key} style={{ display: 'flex', flexDirection: 'column', minWidth: 240 }}>
                {field.label}
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(event) =>
                    setMapping((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                >
                  <option value="">— нет —</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="button" onClick={handleCommit} disabled={loading}>
              Сохранить в базу
            </button>
          </div>
          <h3 style={{ marginTop: 24 }}>Предпросмотр ({preview.preview.length} / {preview.totalRows})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  {preview.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, index) => (
                  <tr key={index}>
                    {preview.headers.map((header) => (
                      <td key={header}>{row[header]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
