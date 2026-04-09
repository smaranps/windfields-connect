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
} from "react-native";
import { auth, db } from "../services/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      <ScrollView contentContainerStyle={{ padding: 30, paddingTop: 60 }}>
        <Text style={{ fontSize: 32, color: "white", fontWeight: "bold" }}>
          Sign-in
        </Text>

        <View
          style={{
            marginTop: 40,
            backgroundColor: "white",
            borderRadius: 30,
            padding: 25,
          }}
        >
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="gray"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="gray"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="gray"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <TouchableOpacity onPress={onLoginPressed} style={styles.button}>
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              LOGIN
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  input: {
    borderBottomWidth: 1,
    borderColor: "#06c9c1",
    marginBottom: 20,
    padding: 10,
    color: "#000",
  },
  button: {
    backgroundColor: "#0191d6",
    padding: 15,
    borderRadius: 20,
    marginTop: 20,
  },
});
