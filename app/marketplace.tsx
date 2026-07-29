import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AppIcon } from "@/app/components/icon";
import * as ImagePicker from "expo-image-picker";
import { db, auth, storage } from "../services/firebaseConfig";
import { generateListingDetails } from "../services/geminiConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Filter } from "bad-words";

const filter = new Filter();

export default function AddListing() {
  const router = useRouter();

  const params = useLocalSearchParams();
  const isEditing = params.isEditing === "true";
  const listingId = params.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [hasLoadedParams, setHasLoadedParams] = useState(false);

  useEffect(() => {
    if (isEditing && !hasLoadedParams) {
      if (params.title) setTitle(params.title as string);
      if (params.description) setDescription(params.description as string);
      if (params.price) setPrice(params.price.toString());
      if (params.image) setImage(params.image as string);

      setHasLoadedParams(true);
    }
  }, [isEditing, params, hasLoadedParams]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your camera roll.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleAiAutoFill = async () => {
    if (!image) {
      Alert.alert(
        "No Photo Provided",
        "Please select or snap a photo of your item first!"
      );
      return;
    }

    setIsAiLoading(true);
    try {
      const aiSuggestion = await generateListingDetails(image);
      setTitle(aiSuggestion.title);
      setDescription(aiSuggestion.description);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "AI Error",
        "Could not analyze the photo. Please feel free to type manually!"
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePostListing = async () => {
    if (!title.trim() || !price.trim() || !image) {
      Alert.alert(
        "Missing Fields",
        "Please provide a title, price, and photo."
      );
      return;
    }

    if (filter.isProfane(title) || filter.isProfane(description)) {
      Alert.alert(
        "Guidelines Warning",
        "Your listing contains language that violates our safety policies."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("No user logged in");

      let imageUrl = image;

      const isNewImageSelected =
        image.startsWith("file:") ||
        image.startsWith("ph:") ||
        image.startsWith("content:");

      if (isNewImageSelected) {
        const response = await fetch(image);
        const blob = await response.blob();
        const storageRef = ref(storage, `listings/${Date.now()}_${uid}`);
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
      }

      const numericPrice = parseFloat(price) || 0;

      if (isEditing) {
        const docRef = doc(db, "listings", listingId);
        await updateDoc(docRef, {
          title: title.trim(),
          description: description.trim(),
          price: numericPrice,
          image: imageUrl,
          updatedAt: serverTimestamp(),
        });

        Alert.alert("", "Your listing has been updated successfully.", [
          {
            text: "Awesome",
            onPress: () => {
              router.back();
            },
          },
        ]);
      } else {
        const userDoc = await getDoc(doc(db, "users", uid));
        const sellerName = userDoc.data()?.username || "Neighbor";

        await addDoc(collection(db, "listings"), {
          title: title.trim(),
          description: description.trim(),
          price: numericPrice,
          image: imageUrl,
          sellerId: uid,
          sellerName: sellerName,
          status: "available",
          createdAt: serverTimestamp(),
        });

        Alert.alert("", "Your item is now live in the marketplace.", [
          { text: "Awesome", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save your listing. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0a0f24", "#0191d6", "#06c9c1"]}
      style={{ flex: 1 }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>
          <TouchableOpacity
            style={styles.BackButton}
            onPress={() => router.back()}
          >
            <AppIcon
              sfName="chevron.left"
              lucideName="ChevronLeft"
              size={20}
              color="white"
            />
          </TouchableOpacity>

          <Text style={styles.title}>
            {isEditing ? "Edit Your Listing" : "List an Item"}
          </Text>

          <View style={styles.mainContent}>
            <TouchableOpacity onPress={pickImage} style={styles.imageSelector}>
              {image ? (
                <Image source={{ uri: image }} style={styles.selectedImage} />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <View style={styles.cameraIconContainer}>
                    <AppIcon
                      sfName="camera.fill"
                      lucideName="Camera"
                      size={26}
                      color="white"
                    />
                  </View>
                  <Text style={styles.uploadText}>Add a photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {image && (
              <TouchableOpacity
                style={[
                  styles.aiButton,
                  isAiLoading && styles.aiButtonDisabled,
                ]}
                onPress={handleAiAutoFill}
                disabled={isAiLoading}
              >
                {isAiLoading ? (
                  <View style={styles.aiContent}>
                    <ActivityIndicator
                      size="small"
                      color="#ffffff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.aiButtonTextLoading}>
                      Gemini is analyzing your item...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.aiContent}>
                    <View style={{ marginRight: 8 }}>
                      <AppIcon
                        sfName="sparkles"
                        lucideName="Sparkles"
                        size={16}
                        color="white"
                      />
                    </View>
                    <Text style={styles.aiButtonText}>
                      Auto-Fill Details with Gemini
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.glassInputCard}>
              <TextInput
                placeholder="What are you selling?"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />

              <View style={styles.row}>
                <TextInput
                  placeholder="Price ($)"
                  value={price}
                  keyboardType="numeric"
                  onChangeText={setPrice}
                  style={[styles.input, { flex: 1 }]}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              </View>

              <TextInput
                placeholder="Describe condition/pickup location..."
                value={description}
                onChangeText={setDescription}
                multiline
                style={[
                  styles.input,
                  { height: 120, textAlignVertical: "top" },
                ]}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />

              <TouchableOpacity
                style={[styles.button, isSubmitting && { opacity: 0.7 }]}
                onPress={handlePostListing}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0191d6" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isEditing ? "Update Listing" : "Post to Marketplace"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 80,
  },
  BackButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 24,
    marginTop: 40,
    letterSpacing: -0.5,
  },
  mainContent: {
    gap: 16,
    marginBottom: 50,
  },
  imageSelector: {
    height: 220,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  cameraIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    padding: 16,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  uploadText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 15,
    fontWeight: "600",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  aiButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
    shadowColor: "#06c9c1",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
    marginTop: -4,
  },
  aiButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  aiContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  aiButtonTextLoading: {
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
    fontSize: 14,
  },
  glassInputCard: {
    backgroundColor: "rgba(255, 255, 255, 0.11)",
    borderRadius: 28,
    padding: 24,
    gap: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.22)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "white",
  },
  button: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#fff",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: "#0a0f24",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
