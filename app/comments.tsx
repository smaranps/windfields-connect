import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Alert,
} from "react-native";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface CommentsProps {
  postId: string;
}
export default function Comments({ postId }: CommentsProps) {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [currentUsername, setCurrentUsername] = useState("Anonymous");

  useEffect(() => {
    const fetchUser = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) setCurrentUsername(userDoc.data().username);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [postId]);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        text: commentText,
        author: currentUsername,
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      setCommentText("");
      Keyboard.dismiss();
    } catch (e) {
      console.error(e);
    }
  };
  const handleLikeComment = async (
    commentId: string,
    currentLikedBy: string[]
  ) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const commentRef = doc(db, "posts", postId, "comments", commentId);
    const isLiked = currentLikedBy?.includes(uid);

    await updateDoc(commentRef, {
      likes: isLiked ? increment(-1) : increment(1),
      likedBy: isLiked ? arrayRemove(uid) : arrayUnion(uid),
    });
  };
  const handleDeleteComment = async (commentId: string) => {
    try {
      const commentRef = doc(db, "posts", postId, "comments", commentId);
      await deleteDoc(commentRef);
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        commentCount: increment(-1),
        featuredComment: "", 
        featuredCommentAuthor: "" 
      });
  
    } catch (error) {
      console.error("Delete failed", error);
    }
  };
  return (
    <View style={styles.container}>
      {comments.map((item: any) => {
        const isLiked = item.likedBy?.includes(auth.currentUser?.uid);
        const isMyComment = item.userId === auth.currentUser?.uid;
        return (
          <View key={item.id} style={styles.commentContainer}>
            <View style={styles.miniAvatar}>
              <Text style={styles.avatarText}>{item.author?.charAt(0)}</Text>
            </View>

            <View style={styles.commentContent}>
              <View style={styles.commentBubble}>
                <Text style={styles.authorName}>{item.author}</Text>
                {isMyComment && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(item.id)}
                  >
                    <IconSymbol name="trash" size={14} color="#ff4444" />
                  </TouchableOpacity>
                )}
                <Text style={styles.commentText}>{item.text}</Text>
              </View>

              <View style={styles.commentFooter}>
                <Text style={styles.footerText}>2h</Text>
                <TouchableOpacity>
                  <Text style={styles.footerAction}>Reply</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => handleLikeComment(item.id, item.likedBy)}
                style={styles.commentHeart}
              >
                <IconSymbol
                  name={isLiked ? "heart.fill" : "heart"}
                  size={14}
                  color={isLiked ? "red" : "#888"}
                />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
        />
        <TouchableOpacity onPress={submitComment}>
          <Text style={styles.postBtn}>Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10, paddingHorizontal: 10 },
  commentItem: { flexDirection: "row", marginBottom: 5 },
  author: { fontWeight: "bold", color: "#333" },
  text: { color: "#555" },
  inputRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  input: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 15,
    padding: 8,
    marginRight: 10,
  },
  postBtn: { color: "#0191d6", fontWeight: "bold" },
  commentHeart: {
    padding: 10,
  },
  commentContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF8225",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  avatarText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: "#F0F2F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderTopLeftRadius: 2,
  },
  authorName: {
    fontWeight: "700",
    fontSize: 13,
    color: "#262626",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: "#1C1E21",
    lineHeight: 18,
  },
  commentFooter: {
    flexDirection: "row",
    marginTop: 4,
    marginLeft: 4,
    gap: 15,
  },
  footerText: {
    fontSize: 12,
    color: "#65676B",
  },
  footerAction: {
    fontSize: 12,
    fontWeight: "600",
    color: "#65676B",
  },
});
