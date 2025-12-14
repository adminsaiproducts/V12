/**
 * V9データ構造のヘルパー関数
 *
 * V9のデータ構造例:
 * - name: string ("関原　亮")
 * - phone: { original, cleaned, issues, isValid, type }
 * - address: {
 *     postalCode: { original, cleaned, issues },
 *     prefecture: { original, cleaned, issues },
 *     city: { original, cleaned, issues },
 *     town: { original, cleaned, issues },
 *     building: { original, cleaned, issues },
 *     fullAddress: string
 *   }
 */

/**
 * V9のフィールドから文字列値を抽出
 * - 文字列の場合: そのまま返す
 * - { cleaned, original } 形式の場合: cleanedを優先して返す
 * - { fullAddress } 形式の場合: fullAddressを返す
 */
export function extractValue(field: unknown): string {
  if (field === null || field === undefined) return '';
  if (typeof field === 'string') {
    // JSON文字列の場合はパースを試みる
    if (field.startsWith('{') || field.startsWith('[')) {
      try {
        const parsed = JSON.parse(field);
        return extractValue(parsed); // 再帰的に処理
      } catch {
        return field;
      }
    }
    return field;
  }
  if (typeof field === 'number') return String(field);
  if (typeof field === 'boolean') return field ? 'はい' : 'いいえ';

  if (typeof field === 'object') {
    const obj = field as Record<string, unknown>;

    // cleaned を優先
    if (typeof obj.cleaned === 'string' && obj.cleaned) {
      return obj.cleaned;
    }
    // original がある場合
    if (typeof obj.original === 'string' && obj.original) {
      return obj.original;
    }
    // fullAddress がある場合
    if (typeof obj.fullAddress === 'string' && obj.fullAddress) {
      return obj.fullAddress;
    }
    // value がある場合
    if (typeof obj.value === 'string' && obj.value) {
      return obj.value;
    }
  }

  return '';
}

/**
 * V9の住所オブジェクトをフォーマット
 *
 * V9の住所構造（2パターンあり）:
 * パターン1: フィールドが直接文字列
 * {
 *   postalCode: "236-0021",
 *   prefecture: "神奈川県",
 *   city: "横浜市金沢区",
 *   town: "泥亀",
 *   streetNumber: "2-5-1-509",
 *   building: "",
 *   fullAddress: "神奈川県横浜市金沢区泥亀2-5-1-509"
 * }
 *
 * パターン2: フィールドがオブジェクト
 * {
 *   postalCode: { original, cleaned, issues },
 *   prefecture: { original, cleaned, issues },
 *   ...
 *   fullAddress: "神奈川県横浜市金沢区泥亀2-5-1-509"
 * }
 */
export function formatAddress(address: unknown): string {
  // 入力がない場合
  if (!address) return '-';

  // 入力が文字列の場合
  if (typeof address === 'string') {
    // JSON文字列の場合はパースを試みる
    if (address.startsWith('{') || address.startsWith('[')) {
      try {
        const parsed = JSON.parse(address);
        return formatAddress(parsed); // 再帰的に処理
      } catch {
        // パースに失敗した場合は通常の文字列として返す
        return address || '-';
      }
    }
    return address || '-';
  }

  // 入力がオブジェクトの場合
  if (typeof address === 'object' && address !== null) {
    const addr = address as Record<string, unknown>;

    // fullAddress が文字列で存在する場合、それを優先使用
    if (addr.fullAddress !== undefined && addr.fullAddress !== null && addr.fullAddress !== '') {
      const fullAddr = String(addr.fullAddress);
      if (fullAddr) {
        return fullAddr;
      }
    }

    // full が文字列で存在する場合（V12の型定義）
    if (addr.full !== undefined && addr.full !== null && addr.full !== '') {
      const full = String(addr.full);
      if (full) {
        return full;
      }
    }

    // 各フィールドを抽出して結合
    const postalCode = extractValue(addr.postalCode);
    const prefecture = extractValue(addr.prefecture);
    const city = extractValue(addr.city);
    const town = extractValue(addr.town);
    const streetNumber = extractValue(addr.streetNumber);
    const building = extractValue(addr.building);

    // 住所パーツを結合
    const addressParts = [prefecture, city, town, streetNumber, building].filter(v => v);

    if (addressParts.length > 0) {
      const addressStr = addressParts.join('');
      if (postalCode) {
        return `〒${postalCode} ${addressStr}`;
      }
      return addressStr;
    }

    // 何も取得できなかった場合
    return '-';
  }

  return '-';
}

/**
 * 顧客名を取得
 * V9では name は文字列
 * 注意: 元データ(Geniee CRM)で使用者名が空のレコードが12件存在する
 *       これらは元データの問題であり、フリガナと混同してはいけない
 */
export function getCustomerName(customer: Record<string, unknown>): string {
  const name = customer.name;
  if (typeof name === 'string' && name) {
    return name;
  }
  // オブジェクトの場合はextractValueを使用
  const extracted = extractValue(name);
  return extracted || '-';
}

/**
 * 顧客のフリガナを取得
 */
export function getCustomerNameKana(customer: Record<string, unknown>): string {
  const nameKana = customer.nameKana;
  if (typeof nameKana === 'string') {
    return nameKana;
  }
  return extractValue(nameKana);
}

/**
 * 電話番号を取得
 * V9では phone は { original, cleaned, issues, isValid, type } 形式
 * 注意: cleanedは正規化処理で桁が欠落する場合があるため、originalを優先して表示
 */
export function getPhoneNumber(phone: unknown): string {
  if (!phone) return '-';
  if (typeof phone === 'string') {
    // JSON文字列の場合はパースを試みる
    if (phone.startsWith('{') || phone.startsWith('[')) {
      try {
        const parsed = JSON.parse(phone);
        return getPhoneNumber(parsed); // 再帰的に処理
      } catch {
        return phone || '-';
      }
    }
    return phone || '-';
  }

  if (typeof phone === 'object' && phone !== null) {
    const obj = phone as Record<string, unknown>;
    // original を優先（cleanedは正規化処理で桁が欠落する場合があるため）
    if (typeof obj.original === 'string' && obj.original) {
      return obj.original;
    }
    if (typeof obj.cleaned === 'string' && obj.cleaned) {
      return obj.cleaned;
    }
  }

  return '-';
}

/**
 * メールアドレスを取得
 */
export function getEmail(email: unknown): string {
  if (!email) return '';
  if (typeof email === 'string') return email;

  if (typeof email === 'object' && email !== null) {
    const obj = email as Record<string, unknown>;
    if (typeof obj.cleaned === 'string' && obj.cleaned) {
      return obj.cleaned;
    }
    if (typeof obj.original === 'string' && obj.original) {
      return obj.original;
    }
  }

  return '';
}

/**
 * 備考を取得
 */
export function getMemo(memo: unknown): string {
  if (!memo) return '';
  if (typeof memo === 'string') return memo;
  return extractValue(memo);
}
