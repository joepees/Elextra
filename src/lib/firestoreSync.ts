import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc } from "firebase/firestore";
import { firestore, auth, googleProvider, setGmailAccessToken } from "./firebase";
import { signInWithPopup, UserCredential, GoogleAuthProvider } from "firebase/auth";
import { User, Order } from "../types";
import { DB } from "../db";

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result: UserCredential = await signInWithPopup(auth, googleProvider);
    
    // Save Google Access Token to in-memory cache for Gmail usage
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential && credential.accessToken) {
      setGmailAccessToken(credential.accessToken);
    }
    const fbUser = result.user;
    if (!fbUser || !fbUser.email) return null;

    // Check if user already exists in Firestore
    const userDocRef = doc(firestore, "users", fbUser.email.toLowerCase());
    const docSnap = await getDoc(userDocRef);

    let clientUser: User;

    if (docSnap.exists()) {
      const data = docSnap.data();
      clientUser = {
        id: data.id || Date.now(),
        name: data.name || fbUser.displayName || "Google User",
        email: data.email || fbUser.email,
        phone: data.phone || fbUser.phoneNumber || "0240000000",
        location: data.location || "Tarkwa",
        type: data.type || "ind",
        password: data.password || "google-auth-secured",
      };
    } else {
      // Create a brand new user profile
      clientUser = {
        id: Date.now(),
        name: fbUser.displayName || "Google User",
        email: fbUser.email,
        phone: fbUser.phoneNumber || "0240000000",
        location: "Tarkwa", // Default hub location
        type: "ind",
        password: "google-auth-secured",
      };
      // Save to Firestore
      await setDoc(userDocRef, clientUser);
    }

    // Save to local DB/storage
    await DB.set("elx_user", clientUser);

    // Sync other users in DB
    const currentUsers = await DB.get("elx_users") || [];
    const updatedUsers = [
      ...currentUsers.filter((x: any) => x.email.toLowerCase() !== clientUser.email.toLowerCase()),
      clientUser
    ];
    await DB.set("elx_users", updatedUsers);
    window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_users", value: updatedUsers } }));

    return clientUser;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

export async function saveUserToFirestore(user: User): Promise<void> {
  if (!user || !user.email) return;
  try {
    const userDocRef = doc(firestore, "users", user.email.toLowerCase());
    await setDoc(userDocRef, user, { merge: true });
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
  }
}

export async function saveOrderToFirestore(order: Order): Promise<void> {
  if (!order || !order.id) return;
  try {
    const orderDocRef = doc(firestore, "orders", order.id);
    await setDoc(orderDocRef, order, { merge: true });
  } catch (error) {
    console.error("Error saving order to Firestore:", error);
  }
}

export async function syncLocalOrdersToFirestore(orders: Order[]): Promise<void> {
  if (!Array.isArray(orders)) return;
  try {
    for (const order of orders) {
      if (order && order.id) {
        await saveOrderToFirestore(order);
      }
    }
  } catch (error) {
    console.error("Error syncing local orders to Firestore:", error);
  }
}

export async function getOrdersFromFirestore(userEmail?: string): Promise<Order[]> {
  try {
    const ordersCol = collection(firestore, "orders");
    let q = query(ordersCol);
    if (userEmail) {
      q = query(ordersCol, where("customer.email", "==", userEmail.toLowerCase()));
    }
    const querySnapshot = await getDocs(q);
    const ordersList: Order[] = [];
    querySnapshot.forEach((docSnap) => {
      ordersList.push(docSnap.data() as Order);
    });
    return ordersList;
  } catch (error) {
    console.error("Error getting orders from Firestore:", error);
    return [];
  }
}

export async function getUsersFromFirestore(): Promise<User[]> {
  try {
    const usersCol = collection(firestore, "users");
    const querySnapshot = await getDocs(usersCol);
    const usersList: User[] = [];
    querySnapshot.forEach((docSnap) => {
      usersList.push(docSnap.data() as User);
    });
    return usersList;
  } catch (error) {
    console.error("Error getting users from Firestore:", error);
    return [];
  }
}
