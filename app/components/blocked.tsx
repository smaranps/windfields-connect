import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../services/firebaseConfig";

export function useBlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setBlockedUsers([]);
      return;
    }

    const userRef = doc(db, "users", currentUid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setBlockedUsers(docSnap.data().blockedUsers || []);
      }
    });

    return () => unsubscribe();
  }, []);

  return blockedUsers;
}
