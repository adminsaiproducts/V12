/**
 * CSVエクスポート機能
 */

/**
 * エクスポート対象のフィールド定義
 */
interface ExportField {
  key: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValue: (customer: any) => string;
}

/**
 * 顧客エクスポート用フィールド定義
 */
const CUSTOMER_EXPORT_FIELDS: ExportField[] = [
  { key: 'trackingNo', label: '追客No', getValue: (c) => c.trackingNo || '' },
  { key: 'name', label: '顧客名', getValue: (c) => c.name || '' },
  { key: 'nameKana', label: 'フリガナ', getValue: (c) => c.nameKana || '' },
  { key: 'customerCategory', label: '顧客区分', getValue: (c) => c.customerCategory || '' },
  { key: 'branch', label: '拠点', getValue: (c) => c.branch || '' },
  { key: 'phone', label: '電話番号', getValue: (c) => c.phone || c.phoneOriginal || '' },
  { key: 'mobile', label: '携帯番号', getValue: (c) => c.mobile || '' },
  { key: 'email', label: 'メール', getValue: (c) => c.email || '' },
  {
    key: 'postalCode',
    label: '郵便番号',
    getValue: (c) => {
      if (c.address?.postalCode) return c.address.postalCode;
      return c.postalCode || '';
    },
  },
  {
    key: 'prefecture',
    label: '都道府県',
    getValue: (c) => {
      if (c.address?.prefecture) return c.address.prefecture;
      return c.prefecture || '';
    },
  },
  {
    key: 'city',
    label: '市区町村',
    getValue: (c) => {
      if (c.address?.city) return c.address.city;
      return c.city || '';
    },
  },
  {
    key: 'town',
    label: '町域',
    getValue: (c) => {
      if (c.address?.town) return c.address.town;
      return c.town || '';
    },
  },
  {
    key: 'streetNumber',
    label: '番地',
    getValue: (c) => {
      if (c.address?.streetNumber) return c.address.streetNumber;
      if (typeof c.address === 'string') return c.address;
      return '';
    },
  },
  {
    key: 'building',
    label: '建物名',
    getValue: (c) => {
      if (c.address?.building) return c.address.building;
      return c.building || '';
    },
  },
  { key: 'assignedTo', label: '担当者', getValue: (c) => c.assignedTo || '' },
  {
    key: 'hasDeals',
    label: '一般商談',
    getValue: (c) => (c.hasDeals ? 'あり' : ''),
  },
  {
    key: 'hasTreeBurialDeals',
    label: '樹木墓商談',
    getValue: (c) => (c.hasTreeBurialDeals ? 'あり' : ''),
  },
  {
    key: 'hasBurialPersons',
    label: '樹木墓オプション',
    getValue: (c) => (c.hasBurialPersons ? 'あり' : ''),
  },
  { key: 'memo', label: '備考', getValue: (c) => c.memo || c.notes || '' },
  { key: 'createdAt', label: '登録日', getValue: (c) => formatDate(c.createdAt) },
  { key: 'updatedAt', label: '更新日', getValue: (c) => formatDate(c.updatedAt) },
];

/**
 * 日付フォーマット
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP');
  } catch {
    return '';
  }
}

/**
 * CSVフィールド値をエスケープ
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 顧客データをCSV文字列に変換
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function customersToCSV(customers: any[]): string {
  // ヘッダー行
  const headers = CUSTOMER_EXPORT_FIELDS.map((f) => f.label);
  const headerLine = headers.map(escapeCSVField).join(',');

  // データ行
  const dataLines = customers.map((customer) => {
    const values = CUSTOMER_EXPORT_FIELDS.map((field) => {
      const value = field.getValue(customer);
      return escapeCSVField(value);
    });
    return values.join(',');
  });

  // BOM付きUTF-8で結合
  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

/**
 * CSVをダウンロード
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function downloadCustomersCSV(customers: any[], filename?: string): void {
  const csv = customersToCSV(customers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `customers_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
