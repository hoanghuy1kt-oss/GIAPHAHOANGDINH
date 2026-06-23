import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWfeEALd1yqff99tTQwXEwHAII6zgd8Hs",
  authDomain: "giaphahoangdinh.firebaseapp.com",
  projectId: "giaphahoangdinh",
  storageBucket: "giaphahoangdinh.firebasestorage.app",
  messagingSenderId: "775275302182",
  appId: "1:775275302182:web:6a6a5366c1366e17dd45e7",
  measurementId: "G-6GXCR5MFX6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Helper to fetch all documents from a collection
export async function getCollectionData(collectionName) {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });
    return data;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    return [];
  }
}

// Fetch members
export async function dbGetMembers() {
  return getCollectionData("members");
}

// Fetch tributes
export async function dbGetTributes() {
  return getCollectionData("tributes");
}

// Fetch requests
export async function dbGetRequests() {
  return getCollectionData("requests");
}

// Set / Add a member
export async function dbSaveMember(member) {
  try {
    const docRef = doc(db, "members", String(member.id));
    await setDoc(docRef, member);
  } catch (error) {
    console.error("Error saving member:", error);
    throw error;
  }
}

// Delete a member
export async function dbDeleteMember(id) {
  try {
    const docRef = doc(db, "members", String(id));
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting member:", error);
    throw error;
  }
}

// Set / Add a tribute
export async function dbSaveTribute(tribute) {
  try {
    const docRef = doc(db, "tributes", String(tribute.id));
    await setDoc(docRef, tribute);
  } catch (error) {
    console.error("Error saving tribute:", error);
    throw error;
  }
}

// Delete a tribute
export async function dbDeleteTribute(id) {
  try {
    const docRef = doc(db, "tributes", String(id));
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting tribute:", error);
    throw error;
  }
}

// Set / Add a request
export async function dbSaveRequest(request) {
  try {
    const docRef = doc(db, "requests", String(request.id));
    await setDoc(docRef, request);
  } catch (error) {
    console.error("Error saving request:", error);
    throw error;
  }
}

// Delete a request
export async function dbDeleteRequest(id) {
  try {
    const docRef = doc(db, "requests", String(id));
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting request:", error);
    throw error;
  }
}

// Batch set members (used in imports)
export async function dbImportData(membersList, tributesList = []) {
  try {
    // First, we delete all existing members, tributes, and requests to make a clean import
    const memberSnapshot = await getDocs(collection(db, "members"));
    const tributeSnapshot = await getDocs(collection(db, "tributes"));
    const requestSnapshot = await getDocs(collection(db, "requests"));

    const batch = writeBatch(db);

    memberSnapshot.forEach((document) => {
      batch.delete(doc(db, "members", document.id));
    });
    tributeSnapshot.forEach((document) => {
      batch.delete(doc(db, "tributes", document.id));
    });
    requestSnapshot.forEach((document) => {
      batch.delete(doc(db, "requests", document.id));
    });

    // Write new members
    membersList.forEach((m) => {
      const docRef = doc(db, "members", String(m.id));
      batch.set(docRef, m);
    });

    // Write new tributes
    tributesList.forEach((t) => {
      const docRef = doc(db, "tributes", String(t.id));
      batch.set(docRef, t);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error importing data into Firestore:", error);
    throw error;
  }
}
