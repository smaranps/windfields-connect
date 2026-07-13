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
} from "react-native";
import { auth, db, storage } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    const fetchUser = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || "Neighbor");
          setBio(data.bio || "");
          setProfilePic(
            data.profilePicUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${
                data.username || "User"
              }`
          );
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);
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
      await updateDoc(doc(db, "users", uid), {
        profilePicUrl: downloadUrl,
      });

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
      await updateDoc(doc(db, "users", uid), {
        username: finalUsername,
        bio: bio,
      });
      setUsername(finalUsername);
      setNewUsername("");
      Alert.alert("Success", "Profile details updated!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save your changes.");
    }
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
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: "#0191d6",
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
});
