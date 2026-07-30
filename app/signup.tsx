import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { auth, db } from "../services/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, addDoc, collection, getDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Stack } from "expo-router";
import { AppIcon } from "@/app/components/icon";
import { BlurView } from "expo-blur";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  GoogleAuthProvider,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";

const { height } = Dimensions.get("window");

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "460155358748-1gqevqe05m0vdlmvn8ci2ha50ciicv48.apps.googleusercontent.com",
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  const onRegisterPressed = async () => {
    if (!email || !password || !name) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        username: name,
        email: email,
        neighborhood: "Windfields",
        createdAt: new Date().toISOString(),
        points: 0,
        blockedUsers: [],
      });
      await addDoc(collection(db, "mail"), {
        to: email,
        message: {
          subject: "Welcome to Windfields Connect! 🏡",
          text: `Hi ${name}! Welcome to the Windfields community. We are thrilled to have you here!`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2>Welcome to the neighborhood, ${name}! 👋</h2>
              <p>We are so excited to welcome you to <strong>Windfields Connect</strong>.</p>
              <p>Our community is built on helping neighbors connect, share updates, and stay informed about everything happening around Oshawa.</p>
              <br />
              <p>Cheers,</p>
              <p><strong>The Windfields Connect Team</strong></p>
            </div>
          `,
        },
      });

      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Error signing up: ", error.message);
      Alert.alert("Signup Error", error.message);
    }
  };

  const generateUsername = (displayName: string | null, email: string) => {
    if (displayName) {
      return displayName.toLowerCase().replace(/\s+/g, "");
    }
    return email.split("@")[0].toLowerCase();
  };

  const onGoogleLoginPressed = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) throw new Error("Error. Please try again.");

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      const currentName = user.displayName || "";
      let finalUsername = currentName;

      if (!currentName || currentName.includes(" ")) {
        finalUsername = generateUsername(currentName, user.email || "");

        await updateProfile(user, {
          displayName: finalUsername,
        });

        await user.reload();
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          username: finalUsername,
          createdAt: new Date().toISOString(),
          blockedUsers: [],
        });
        if (user.email) {
          await addDoc(collection(db, "mail"), {
            to: user.email,
            message: {
              subject: "Welcome to Windfields Connect! 🏡",
              text: `Hi ${finalUsername}! Welcome to the Windfields community. We are thrilled to have you here!`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                  <h2>Welcome to the neighborhood, ${finalUsername}! 👋</h2>
                  <p>We are so excited to welcome you to <strong>Windfields Connect</strong>.</p>
                  <p>Our community is built on helping neighbors connect, share updates, and stay informed about everything happening around Oshawa.</p>
                  <br />
                  <p>Cheers,</p>
                  <p><strong>The Windfields Connect Team</strong></p>
                </div>
              `,
            },
          });
        }
      }

      router.replace("/(tabs)");
    } catch (error: any) {
      if (error.code !== "12501") {
        Alert.alert("Google Sign-In Error", error.message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0191d6", "#06c9c1"]} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.BackButton}
          onPress={() => router.back()}
        >
          <AppIcon
            sfName="chevron.left"
            lucideName="ChevronLeft"
            size={20}
            color="#111827"
          />
        </TouchableOpacity>

        <View style={styles.glassWrapper}>
          <BlurView tint="light" intensity={75} style={styles.card}>
            <View style={styles.iconHeader}>
              <AppIcon
                sfName="person.badge.plus"
                lucideName="UserPlus"
                size={24}
                color="#111827"
              />
            </View>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join your neighborhood network to receive live events and view
              safety updates.
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <AppIcon
                  sfName="person.fill"
                  lucideName="User"
                  size={16}
                  color="#8E8E93"
                />
              </View>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#8E8E93"
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <AppIcon
                  sfName="envelope.fill"
                  lucideName="Mail"
                  size={16}
                  color="#8E8E93"
                />
              </View>
              <TextInput
                placeholder="Email"
                placeholderTextColor="#8E8E93"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <AppIcon
                  sfName="lock.fill"
                  lucideName="Lock"
                  size={16}
                  color="#8E8E93"
                />
              </View>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#8E8E93"
                secureTextEntry={secureText}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setSecureText(!secureText)}
                style={styles.eyeIcon}
              >
                <AppIcon
                  sfName={secureText ? "eye.slash.fill" : "eye.fill"}
                  lucideName={secureText ? "EyeOff" : "Eye"}
                  size={16}
                  color="#8E8E93"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onRegisterPressed} style={styles.button}>
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              onPress={onGoogleLoginPressed}
              style={[styles.googleButton, isGoogleLoading && { opacity: 0.6 }]}
              disabled={isGoogleLoading}
            >
              <FontAwesome name="google" size={18} color="#1C1C1E" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    minHeight: height,
    justifyContent: "center",
    padding: 24,
  },
  BackButton: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  glassWrapper: {
    borderRadius: 36,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 8,
    marginTop: 40,
  },
  card: {
    padding: 28,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  iconHeader: {
    backgroundColor: "white",
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#48484A",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(242, 242, 247, 0.75)",
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 50,
    width: "100%",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#1C1C1E",
    fontSize: 15,
    fontWeight: "500",
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: "#1C1C1E",
    width: "100%",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    marginTop: 16,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    width: "100%",
    height: 52,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(28, 28, 30, 0.15)",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: "#48484A",
    fontWeight: "600",
  },
});
