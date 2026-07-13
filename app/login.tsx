import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
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
import { auth } from "../services/firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Stack } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BlurView } from "expo-blur";

const { height } = Dimensions.get("window");

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const router = useRouter();

  const onLoginPressed = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in successfully!");
      router.replace("/(tabs)/homepage");
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
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
          <IconSymbol name="chevron.left" size={20} color="#111827" />
        </TouchableOpacity>

        <View style={styles.glassWrapper}>
          <BlurView tint="light" intensity={75} style={styles.card}>
            <View style={styles.iconHeader}>
              <IconSymbol
                name="rectangle.portrait.and.arrow.forward"
                size={24}
                color="#111827"
              />
            </View>

            <Text style={styles.title}>Sign in with email</Text>
            <Text style={styles.subtitle}>
              Connect with your local grid to track live safety alerts and
              community events.
            </Text>

            <View style={styles.inputContainer}>
              <IconSymbol
                name="envelope.fill"
                size={16}
                color="#8E8E93"
                style={styles.inputIcon}
              />
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
              <IconSymbol
                name="lock.fill"
                size={16}
                color="#8E8E93"
                style={styles.inputIcon}
              />
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
                <IconSymbol
                  name={secureText ? "eye.slash.fill" : "eye.fill"}
                  size={16}
                  color="#8E8E93"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onLoginPressed} style={styles.button}>
              <Text style={styles.buttonText}>Get Started</Text>
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginRight: 4,
  },
  forgotText: {
    color: "#2C2C2E",
    fontSize: 13,
    fontWeight: "500",
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
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
