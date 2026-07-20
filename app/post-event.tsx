import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { Modal } from "react-native";
import Comments from "./comments";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { db, auth, storage } from "../services/firebaseConfig";
import { addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { Filter } from "bad-words";
import {
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Stack } from "expo-router";

export default function PostEvent() {
  const [content, setContent] = useState("");
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null
  );

  const [isComposerVisible, setIsComposerVisible] = useState(false);

  const filter = new Filter();

  const handleDelete = async (postId: string) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "posts", postId));
          } catch (error) {
            console.error(error);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const [image, setImage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const handlePublish = async () => {
    if ((!content.trim() && !image) || isPublishing) return;

    const isProfane = filter.isProfane(content);
    if (isProfane) {
      Alert.alert(
        "Community Guidelines",
        "Your post contains words that violate our neighborhood guidelines. Please edit your update and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsPublishing(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("No user logged in");
      let cloudImageUrl = null;

      if (image) {
        const response = await fetch(image);
        const blob = await response.blob();
        const storageRef = ref(storage, `posts/${Date.now()}_${uid}`);

        await uploadBytes(storageRef, blob);
        cloudImageUrl = await getDownloadURL(storageRef);
      }
      const userDoc = await getDoc(doc(db, "users", uid));
      const userData = userDoc.data();
      const displayName = userData?.username || "Neighbor";
      const userProfilePic =
        userData?.profilePicUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

      await addDoc(collection(db, "posts"), {
        text: content,
        author: displayName,
        authorProfilePic: userProfilePic,
        userId: uid,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        image: cloudImageUrl,
      });

      setContent("");
      setImage(null);
      setIsComposerVisible(false);
    } catch (e) {
      console.error("Error publishing post: ", e);
      Alert.alert(
        "Upload Error",
        "Something went wrong while saving your post."
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLike = async (postId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const postRef = doc(db, "posts", postId);
    const post = posts.find((p) => p.id === postId);
    const isAlreadyLiked = post?.likedBy?.includes(userId);

    try {
      if (isAlreadyLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likedBy: arrayRemove(userId),
        });
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likedBy: arrayUnion(userId),
        });
      }
    } catch (error) {
      console.error("Error toggling like: ", error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.2,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <LinearGradient colors={["#0191d6", "#06c9c1"]} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.BackButton}
              onPress={() => router.back()}
            >
              <IconSymbol name="chevron.left" size={20} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Neighborhood Feed</Text>
          </View>

          <Text style={styles.sectionHeaderTitle}>Recent Updates</Text>

          {posts.map((item) => {
            const isLiked = item.likedBy?.includes(auth.currentUser?.uid);
            const isMyPost = item.userId === auth.currentUser?.uid;
            const currentAvatarUri =
              item.authorProfilePic ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${
                item.author || "User"
              }`;

            return (
              <View key={item.id} style={styles.instaCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={{ uri: currentAvatarUri }}
                      style={styles.liveAvatar}
                    />
                    <Text style={styles.boldText}>
                      {item.author || "Resident"}
                    </Text>
                  </View>
                  {isMyPost && (
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                      <IconSymbol name="trash" size={18} color="#ff4444" />
                    </TouchableOpacity>
                  )}
                </View>
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.instaImage}
                  />
                )}

                <View style={styles.padding12}>
                  <View style={styles.iconRow}>
                    <TouchableOpacity onPress={() => handleLike(item.id)}>
                      <IconSymbol
                        name={isLiked ? "heart.fill" : "heart"}
                        size={24}
                        color={isLiked ? "red" : "black"}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setActiveCommentPostId(item.id)}
                    >
                      <IconSymbol name="bubble.right" size={24} color="black" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.boldText}>{item.likes || 0} likes</Text>
                  <TouchableOpacity
                    onPress={() => setActiveCommentPostId(item.id)}
                  >
                    <Text style={{ color: "#8e8e8e", marginTop: 5 }}>
                      View all {item.commentCount || 0} comments
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ marginTop: 5 }}>
                    <Text style={styles.boldText}>{item.author}: </Text>
                    {item.text}
                  </Text>
                </View>

                <Modal
                  animationType="slide"
                  transparent={true}
                  visible={activeCommentPostId === item.id}
                  onRequestClose={() => setActiveCommentPostId(null)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.boldText}>Comments</Text>
                        <TouchableOpacity
                          onPress={() => setActiveCommentPostId(null)}
                        >
                          <IconSymbol name="xmark" size={22} color="black" />
                        </TouchableOpacity>
                      </View>
                      <Comments postId={item.id} />
                    </View>
                  </View>
                </Modal>
              </View>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={styles.floatingActionButton}
          onPress={() => setIsComposerVisible(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#ffffff", "rgba(255, 255, 255, 0.6)"]}
            style={styles.fabGradientInner}
          >
            <IconSymbol name="plus" size={26} color="#0191d6" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isComposerVisible}
        onRequestClose={() => setIsComposerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: "65%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.boldText, { fontSize: 18 }]}>
                Create Update
              </Text>
              <TouchableOpacity onPress={() => setIsComposerVisible(false)}>
                <IconSymbol name="xmark" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.composerCard}>
              <TextInput
                placeholder="Type your neighborhood update here..."
                multiline
                value={content}
                onChangeText={setContent}
                style={styles.input}
                placeholderTextColor="#999"
              />

              {image && (
                <View style={styles.imagePreviewBadgeContainer}>
                  <Image
                    source={{ uri: image }}
                    style={styles.attachedPreviewThumbnail}
                  />
                  <TouchableOpacity
                    onPress={() => setImage(null)}
                    style={styles.deleteAttachedImageIndicatorButton}
                  >
                    <IconSymbol name="xmark" size={10} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.composerActionsFooterRow}>
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.attachPhotoIconButton}
                >
                  <IconSymbol
                    name={image ? "photo.fill" : "camera.fill"}
                    size={20}
                    color="#0191d6"
                  />
                  <Text style={styles.attachPhotoIndicatorLabelText}>
                    {image ? "Photo Attached" : "Add Photo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.publishActionBtn,
                    !content.trim() &&
                      !image &&
                      styles.disabledPublishActionBtn,
                  ]}
                  onPress={handlePublish}
                  disabled={!content.trim() && !image}
                >
                  <Text style={styles.buttonText}>Publish</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 20,
    position: "relative",
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginLeft: 60,
  },
  sectionHeaderTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  instaCard: {
    backgroundColor: "white",
    marginBottom: 16,
    width: "100%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    alignItems: "center",
  },
  liveAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#E5E7EB",
  },
  boldText: { fontWeight: "700" },
  instaImage: { width: "100%", height: 320 },
  padding12: { padding: 14 },
  iconRow: { flexDirection: "row", gap: 18, marginBottom: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#f9fafb",
    height: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#edeef0",
    paddingBottom: 12,
    alignItems: "center",
  },

  composerCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    flex: 1,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  input: {
    fontSize: 16,
    color: "#1f2937",
    flex: 1,
    textAlignVertical: "top",
    minHeight: 120,
  },
  composerActionsFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    marginTop: 8,
  },
  attachPhotoIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 30,
  },
  attachPhotoIndicatorLabelText: {
    color: "#0191d6",
    fontSize: 14,
    fontWeight: "600",
  },
  publishActionBtn: {
    backgroundColor: "#0191d6",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 30,
    alignItems: "center",
  },
  disabledPublishActionBtn: {
    backgroundColor: "#93c5fd",
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 15 },
  imagePreviewBadgeContainer: {
    position: "relative",
    marginVertical: 10,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  attachedPreviewThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  deleteAttachedImageIndicatorButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    padding: 4,
  },
  BackButton: {
    position: "absolute",
    left: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  floatingActionButton: {
    position: "absolute",
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  fabGradientInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 30,
  },
});
