/**
 * Firestore Customer document type
 * V9から移植したスキーマ定義
 */
export interface Customer {
  id: string;
  trackingNo: string;
  name: string;
  nameKana?: string;
  phone?: string;
  phone2?: string;
  phone3?: string;
  email?: string;
  address?: Address;
  memo?: string;
  category?: string;
  status?: string;
  assignedTo?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  town?: string;
  building?: string;
  full?: string;
}

/**
 * Firestore Deal document type
 */
export interface Deal {
  id: string;
  customerId: string;
  customerName?: string;
  title: string;
  amount?: number;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  templeId?: string;
  templeName?: string;
  productCategory?: string;
  productSubcategory?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Firestore Temple document type
 */
export interface Temple {
  id: string;
  templeId: string;
  name: string;
  area?: string;
  address?: Address;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Firestore Relationship document type
 */
export interface Relationship {
  id: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  relationshipType: string;
  direction?: 'unidirectional' | 'bidirectional';
  description?: string;
  confidence?: number;
  sourceRecordType?: string;
  sourceRecordId?: string;
  needsManualResolution?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Firestore Activity document type
 */
export interface Activity {
  id: string;
  customerId: string;
  dealId?: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'other';
  subject: string;
  description?: string;
  date: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
