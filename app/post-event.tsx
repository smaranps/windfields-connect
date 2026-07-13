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
import { Stack, router } from "expo-router";

export default function PostEvent() {
  const [content, setContent] = useState("");
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null
  );

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
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.BackButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>What's happening?</Text>
        <View style={styles.inputCard}>
          <TextInput
            placeholder="Type your neighborhood update here..."
            multiline
            value={content}
            onChangeText={setContent}
            style={styles.input}
            placeholderTextColor="#999"
          />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity style={styles.button} onPress={handlePublish}>
              <Text style={styles.buttonText}>Post to Feed</Text>
            </TouchableOpacity>
            <View style={{ marginVertical: 10, marginLeft: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  justifyContent: "space-around",
                }}
              >
                <TouchableOpacity
                  onPress={pickImage}
                  style={{
                    backgroundColor: "#f0f0f0",
                    padding: 10,
                    borderRadius: 50,
                    width: 45,
                    height: 45,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <IconSymbol
                    name={image ? "photo.fill" : "paperclip"}
                    size={22}
                    color="#0191d6"
                  />
                </TouchableOpacity>

                <Text style={{ color: "#666", fontSize: 14 }}>
                  {image ? "Image selected" : "Attach a photo"}
                </Text>
              </View>
            </View>
            {image && (
              <View
                style={{
                  marginTop: 15,
                  borderRadius: 15,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: image }}
                  style={{ width: "100%", height: 200 }}
                />
                <TouchableOpacity
                  onPress={() => setImage(null)}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: 20,
                    padding: 6,
                  }}
                >
                  <IconSymbol name="xmark" size={12} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <ScrollView style={{ marginTop: 30 }}>
          <Text
            style={{
              color: "white",
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 15,
            }}
          >
            Recent Updates
          </Text>

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
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  instaCard: {
    backgroundColor: "white",
    marginBottom: 10,
    width: "100%",
    borderRadius: 15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    alignItems: "center",
  },
  liveAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "#E5E7EB",
  },
  boldText: { fontWeight: "700" },
  instaImage: { width: "100%", height: 350 },
  padding12: { padding: 12 },
  iconRow: { flexDirection: "row", gap: 15, marginBottom: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    height: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  container: { flex: 1, padding: 20, paddingTop: 80 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 50,
    marginTop: 40,
  },
  inputCard: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    height: 300,
    justifyContent: "space-between",
  },
  input: {
    fontSize: 18,
    color: "#333",
    height: "70%",
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#0191d6",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    width: "50%",
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  BackButton: {
    position: "absolute",
    top: -20,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(235, 235, 235, 0.9)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
