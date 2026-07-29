import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Alert,
  Modal,
  TouchableWithoutFeedback,
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
import { Filter } from "bad-words";
import { AppIcon } from "@/app/components/icon";

interface CommentsProps {
  postId: string;
}

const REPORT_REASONS = [
  "Inappropriate Content",
  "Harassment or Bullying",
  "Spam",
  "Hate Speech",
  "Other",
];

export default function Comments({ postId }: CommentsProps) {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [currentUsername, setCurrentUsername] = useState("Anonymous");

  const [selectedReportComment, setSelectedReportComment] = useState<
    any | null
  >(null);
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const filter = new Filter();

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

    if (filter.isProfane(commentText)) {
      Alert.alert(
        "Community Guidelines",
        "Your comment contains words that violate our neighborhood guidelines. Please edit and try again."
      );
      return;
    }

    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        text: commentText,
        author: currentUsername,
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        commentCount: increment(1),
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
      });
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleBlockUser = async (targetUserId: string, authorName: string) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    Alert.alert(
      `Block @${authorName}?`,
      "You will no longer see comments or posts from this user.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block User",
          style: "destructive",
          onPress: async () => {
            try {
              const userRef = doc(db, "users", currentUserId);
              await updateDoc(userRef, {
                blockedUsers: arrayUnion(targetUserId),
              });
              Alert.alert("User Blocked", `You have blocked @${authorName}.`);
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert("Error", "Could not block user. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleUserOptions = (targetUserId: string, authorName: string) => {
    if (targetUserId === auth.currentUser?.uid) return;

    Alert.alert(
      `Resident Options: @${authorName}`,
      "What would you like to do?",
      [
        {
          text: "Block User",
          style: "destructive",
          onPress: () => handleBlockUser(targetUserId, authorName),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const submitCommentReport = async () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !selectedReportComment) return;

    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, "reports"), {
        reporterId: currentUserId,
        reportedUserId: selectedReportComment.userId || null,
        targetId: selectedReportComment.id || null,
        postId: postId,
        targetType: "comment",
        commentText: selectedReportComment.text || "",
        reason: selectedReason,
        details: additionalDetails.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Report Submitted",
        "Thank you for notifying us. Our team will review this comment shortly."
      );

      setAdditionalDetails("");
      setSelectedReason(REPORT_REASONS[0]);
      setSelectedReportComment(null);
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <View style={styles.container}>
      {comments.map((item: any) => {
        const isLiked = item.likedBy?.includes(auth.currentUser?.uid);
        const isMyComment = item.userId === auth.currentUser?.uid;
        return (
          <View key={item.id} style={styles.commentContainer}>
            <TouchableOpacity
              style={styles.miniAvatar}
              onPress={() => handleUserOptions(item.userId, item.author)}
              activeOpacity={isMyComment ? 1 : 0.7}
            >
              <Text style={styles.avatarText}>{item.author?.charAt(0)}</Text>
            </TouchableOpacity>

            <View style={styles.commentContent}>
              <View style={styles.commentBubble}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleUserOptions(item.userId, item.author)}
                    activeOpacity={isMyComment ? 1 : 0.7}
                  >
                    <Text style={styles.authorName}>{item.author}</Text>
                  </TouchableOpacity>

                  {isMyComment ? (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(item.id)}
                    >
                      <AppIcon
                        sfName="trash"
                        lucideName="Trash2"
                        size={14}
                        color="#ff4444"
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setSelectedReportComment(item)}
                    >
                      <AppIcon
                        sfName="flag.fill"
                        lucideName="Flag"
                        size={12}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentText}>{item.text}</Text>
              </View>

              <View style={styles.commentFooter}>
                <Text style={styles.footerText}>Reply</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleLikeComment(item.id, item.likedBy)}
              style={styles.commentHeart}
            >
              <AppIcon
                sfName={isLiked ? "heart.fill" : "heart"}
                lucideName="Heart"
                size={14}
                color={isLiked ? "red" : "#888"}
              />
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={submitComment}>
          <Text style={styles.postBtn}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* REPORT COMMENT MODAL */}
      <Modal
        visible={selectedReportComment !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReportComment(null)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report Comment</Text>
                <TouchableOpacity
                  onPress={() => setSelectedReportComment(null)}
                >
                  <AppIcon
                    sfName="xmark"
                    lucideName="X"
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Why are you reporting this comment by @
                {selectedReportComment?.author}?
              </Text>

              <View style={styles.reasonsContainer}>
                {REPORT_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonChip,
                        isSelected && styles.selectedChip,
                      ]}
                      onPress={() => setSelectedReason(reason)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.selectedChipText,
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>
                Additional Context (Optional)
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Explain why this comment is unacceptable..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                maxLength={300}
                value={additionalDetails}
                onChangeText={setAdditionalDetails}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setSelectedReportComment(null)}
                  disabled={isSubmittingReport}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isSubmittingReport && { opacity: 0.6 },
                  ]}
                  onPress={submitCommentReport}
                  disabled={isSubmittingReport}
                >
                  <Text style={styles.submitText}>
                    {isSubmittingReport ? "Submitting..." : "Submit Report"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10, paddingHorizontal: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  input: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 15,
    padding: 8,
    marginRight: 10,
    fontSize: 14,
    color: "#1c1e21",
  },
  postBtn: { color: "#0191d6", fontWeight: "bold" },
  commentHeart: {
    padding: 8,
    alignSelf: "center",
  },
  commentContainer: {
    flexDirection: "row",
    marginBottom: 14,
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
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
  },
  reasonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  reasonChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectedChip: {
    backgroundColor: "#e0f2fe",
    borderColor: "#0191d6",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  selectedChipText: {
    color: "#0191d6",
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    height: 70,
    textAlignVertical: "top",
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "600",
    color: "#64748b",
    fontSize: 14,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  submitText: {
    fontWeight: "700",
    color: "white",
    fontSize: 14,
  },
});
