import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  Unsubscribe
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Order, ClientAsset } from "../types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const authInstance = getAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance.currentUser?.uid,
      email: authInstance.currentUser?.email,
      emailVerified: authInstance.currentUser?.emailVerified,
      isAnonymous: authInstance.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with custom databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection verification test
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "orders", "health_check"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client is running in offline mode.");
    }
    return false;
  }
}

// Helper: Save order to Firestore
export async function syncOrderToFirestore(order: Order): Promise<void> {
  const path = `orders/${order.broj_racuna || "order_" + Date.now()}`;
  try {
    const docRef = doc(db, "orders", order.broj_racuna || "order_" + Date.now());
    await setDoc(docRef, {
      ...order,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Helper: Batch sync multiple orders
export async function syncAllOrdersToFirestore(orders: Order[]): Promise<void> {
  for (const order of orders) {
    await syncOrderToFirestore(order);
  }
}

// Helper: Save client asset to Firestore
export async function syncAssetToFirestore(asset: ClientAsset): Promise<void> {
  const path = `client_assets/${asset.id}`;
  try {
    const docRef = doc(db, "client_assets", asset.id);
    await setDoc(docRef, {
      ...asset,
      createdAt: asset.createdAt || new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Helper: Delete order from Firestore
export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, "orders", orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Helper: Subscribe to real-time orders
export function subscribeToOrders(
  onOrdersUpdated: (orders: Order[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = "orders";
  return onSnapshot(
    collection(db, "orders"),
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id !== "health_check") {
          orders.push(docSnap.data() as Order);
        }
      });
      if (orders.length > 0) {
        onOrdersUpdated(orders);
      }
    },
    (error) => {
      console.warn("Firestore snapshot listener error:", error);
      if (onError) onError(error);
    }
  );
}

// Helper: Google Sign In popup
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error("Google Auth error:", err);
    return null;
  }
}

// Helper: Sign Out
export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("SignOut error:", err);
  }
}
