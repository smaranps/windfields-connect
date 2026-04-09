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

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      });

      console.log("User registered and data recorded!");
      Alert.alert("Success", "Account created!");
    } catch (error: any) {
      console.error("Error signing up: ", error.message);
      Alert.alert("Signup Error", error.message);
    }
    const router = useRouter();
    console.log("User registered and data recorded");
    Alert.alert("Success", "Account created!", [
      { text: "OK", onPress: () => router.replace("/(tabs)") },
    ]);
  };

  return (
    <LinearGradient colors={["#0191d6", "#06c9c1"]} style={{ flex: 1 }}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={{ padding: 30, paddingTop: 60 }}>
        <Text style={{ fontSize: 32, color: "white", fontWeight: "bold" }}>
          Create Account
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

          <TouchableOpacity onPress={onRegisterPressed} style={styles.button}>
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              GET STARTED
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
