import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDTn9P1uSm9AA76ZhHoRUlOYyV4LGkbpUE",
  authDomain: "gen-lang-client-0003511734.firebaseapp.com",
  projectId: "gen-lang-client-0003511734",
  storageBucket: "gen-lang-client-0003511734.firebasestorage.app",
  messagingSenderId: "230724781382",
  appId: "1:230724781382:web:26bcfa193d0bee25bcd147"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID from config and ignoreUndefinedProperties
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, "ai-studio-f6fa1242-e038-4798-a3b0-dd76f1fc5946");

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData) as unknown as T;
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        newObj[key] = sanitizeData(val);
      }
    }
    return newObj as T;
  }
  return obj;
}

