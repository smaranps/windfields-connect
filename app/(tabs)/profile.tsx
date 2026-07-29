import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  FlatList,
} from "react-native";
import { auth, db, storage } from "../../services/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { AppIcon } from "@/app/components/icon";

const DELETE_ACCOUNT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeOWHwUcEiQo2lnJH2i9YW8N6pmQ5gdCQxNdXVrJzVxsaRMzQ/viewform?usp=header";

export default function ProfileScreen() {
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockedUserProfiles, setBlockedUserProfiles] = useState<any[]>([]);
  const [isBlockedModalVisible, setIsBlockedModalVisible] = useState(false);
  const [loadingBlockedList, setLoadingBlockedList] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsername(data.username || "Neighbor");
          setBio(data.bio || "");
          setProfilePic(
            data.profilePicUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${
                data.username || "User"
              }`
          );
          setBlockedUserIds(data.blockedUsers || []);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleOpenBlockedModal = async () => {
    setIsBlockedModalVisible(true);
    if (blockedUserIds.length === 0) {
      setBlockedUserProfiles([]);
      return;
    }

    setLoadingBlockedList(true);
    try {
      const profiles = await Promise.all(
        blockedUserIds.map(async (bUid) => {
          const userDoc = await getDoc(doc(db, "users", bUid));
          if (userDoc.exists()) {
            return { id: bUid, ...userDoc.data() };
          }
          return { id: bUid, username: "Unknown User", profilePicUrl: null };
        })
      );
      setBlockedUserProfiles(profiles);
    } catch (error) {
      console.error("Error fetching blocked profiles:", error);
    } finally {
      setLoadingBlockedList(false);
    }
  };

  const handleUnblockUser = async (
    targetUserId: string,
    targetName: string
  ) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    Alert.alert(
      `Unblock @${targetName}?`,
      "Their posts, comments, and listings will become visible to you again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            try {
              const userRef = doc(db, "users", currentUid);
              await updateDoc(userRef, {
                blockedUsers: arrayRemove(targetUserId),
              });

              setBlockedUserProfiles((prev) =>
                prev.filter((item) => item.id !== targetUserId)
              );
              Alert.alert("Unblocked", `@${targetName} has been unblocked.`);
            } catch (error) {
              console.error("Error unblocking user:", error);
              Alert.alert("Error", "Failed to unblock user. Try again.");
            }
          },
        },
      ]
    );
  };

  const handlePickAndUploadImage = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need camera roll permissions to update your profile photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (result.canceled) return;

    const selectedUri = result.assets[0].uri;
    setUploading(true);

    try {
      const storageRef = ref(storage, `profile_pictures/${uid}.jpg`);
      const response = await fetch(selectedUri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      await setDoc(
        doc(db, "users", uid),
        {
          profilePicUrl: downloadUrl,
        },
        { merge: true }
      );

      setProfilePic(downloadUrl);
      Alert.alert("Success", "Profile photo updated!");
    } catch (error) {
      console.error("Image upload failed:", error);
      Alert.alert(
        "Upload Error",
        "Failed to save media file to server storage."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    if (bio.length > 150) {
      Alert.alert("Too Long", "Keep your bio under 150 characters!");
      return;
    }

    try {
      const finalUsername = newUsername || username;
      await setDoc(
        doc(db, "users", uid),
        {
          username: finalUsername,
          bio: bio,
        },
        { merge: true }
      );
      setUsername(finalUsername);
      setNewUsername("");
      Alert.alert("Success", "Profile details updated!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save your changes.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "You will be redirected to complete your account deletion request. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(
                DELETE_ACCOUNT_FORM_URL
              );
              if (supported) {
                await Linking.openURL(DELETE_ACCOUNT_FORM_URL);
              } else {
                Alert.alert("Error", "Unable to open the deletion link.");
              }
            } catch (error) {
              console.error("Error opening deletion URL:", error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#0191d6", "#06c9c1"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 0 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.innerContent}>
              <Text style={styles.header}>Your Profile</Text>

              <View style={styles.whiteCard}>
                <View style={styles.infoCard}>
                  <View style={styles.profileHeader}>
                    <TouchableOpacity
                      style={styles.avatarPlaceholder}
                      onPress={handlePickAndUploadImage}
                      disabled={uploading}
                    >
                      {profilePic ? (
                        <Image
                          source={{ uri: profilePic }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={{ color: "#fff" }}>Edit Photo</Text>
                      )}
                      {uploading && (
                        <View style={styles.loaderOverlay}>
                          <ActivityIndicator size="small" color="#ffffff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.usernameText}>
                    @{username || "Not set"}
                  </Text>
                  <Text style={styles.emailText}>
                    {auth.currentUser?.email}
                  </Text>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Enter new username"
                  value={newUsername}
                  onChangeText={setNewUsername}
                  placeholderTextColor="#888"
                />

                <View style={styles.bioHeaderContainer}>
                  <Text style={styles.label}>Bio</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: bio.length >= 150 ? "red" : "#888",
                    }}
                  >
                    {bio.length}/150
                  </Text>
                </View>

                <TextInput
                  style={[
                    styles.input,
                    { height: 80, textAlignVertical: "top" },
                  ]}
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChangeText={setBio}
                  multiline={true}
                  maxLength={150}
                  placeholderTextColor="#888"
                />

                <TouchableOpacity style={styles.button} onPress={handleUpdate}>
                  <Text style={styles.buttonText}>Update Profile</Text>
                </TouchableOpacity>

                {/* Manage Blocked Users Button */}
                <TouchableOpacity
                  style={styles.manageBlockedButton}
                  onPress={handleOpenBlockedModal}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AppIcon
                      sfName="person.crop.circle.badge.xmark"
                      lucideName="UserX"
                      size={18}
                      color="#4b5563"
                    />
                    <Text style={styles.manageBlockedButtonText}>
                      Blocked Users ({blockedUserIds.length})
                    </Text>
                  </View>
                  <AppIcon
                    sfName="chevron.right"
                    lucideName="ChevronRight"
                    size={16}
                    color="#9ca3af"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteAccount}
                >
                  <Text style={styles.deleteButtonText}>
                    Request Account Deletion
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* BLOCKED USERS MODAL */}
      <Modal
        visible={isBlockedModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsBlockedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Blocked Residents</Text>
              <TouchableOpacity onPress={() => setIsBlockedModalVisible(false)}>
                <AppIcon
                  sfName="xmark"
                  lucideName="X"
                  size={22}
                  color="#1f2937"
                />
              </TouchableOpacity>
            </View>

            {loadingBlockedList ? (
              <View style={styles.centeredContainer}>
                <ActivityIndicator size="small" color="#0191d6" />
              </View>
            ) : blockedUserProfiles.length === 0 ? (
              <View style={styles.centeredContainer}>
                <AppIcon
                  sfName="checkmark.circle"
                  lucideName="CheckCircle"
                  size={40}
                  color="#9ca3af"
                />
                <Text style={styles.emptyStateText}>
                  You haven't blocked any residents.
                </Text>
              </View>
            ) : (
              <FlatList
                data={blockedUserProfiles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingVertical: 10 }}
                renderItem={({ item }) => {
                  const avatarUri =
                    item.profilePicUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${
                      item.username || "User"
                    }`;
                  return (
                    <View style={styles.blockedUserRow}>
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.blockedUserAvatar}
                      />
                      <Text style={styles.blockedUsername}>
                        @{item.username || "Neighbor"}
                      </Text>
                      <TouchableOpacity
                        style={styles.unblockButton}
                        onPress={() =>
                          handleUnblockUser(
                            item.id,
                            item.username || "Neighbor"
                          )
                        }
                      >
                        <Text style={styles.unblockButtonText}>Unblock</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "white",
  },
  whiteCard: {
    backgroundColor: "white",
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    flex: 1,
    width: "100%",
  },
  infoCard: {
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "gainsboro",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
    elevation: 5,
    overflow: "hidden",
    position: "relative",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  bioHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  usernameText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  emailText: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 14,
  },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 15,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: "100%",
    color: "#111827",
  },
  button: {
    backgroundColor: "#0191d6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    shadowColor: "#0191d6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  manageBlockedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  manageBlockedButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  deleteButton: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    height: "60%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyStateText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "500",
  },
  blockedUserRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  blockedUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  blockedUsername: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  unblockButton: {
    backgroundColor: "#eff6ff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  unblockButtonText: {
    color: "#0191d6",
    fontWeight: "700",
    fontSize: 13,
  },
});
