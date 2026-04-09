import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { db, auth } from "../../services/firebaseConfig";
import { addDoc, serverTimestamp } from "firebase/firestore";

import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function PostEvent() {
  const [content, setContent] = useState("");
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handlePublish = async () => {
    if (!content.trim()) {
      Alert.alert("Wait!", "You can't post an empty message.");
      return;
    }

    try {
      await addDoc(collection(db, "posts"), {
        text: content,
        author: auth.currentUser?.email,
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Post shared with Windfields!");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <LinearGradient colors={["#0191d6", "#06c9c1"]} style={{ flex: 1 }}>
      <View style={styles.container}>
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

          <TouchableOpacity style={styles.button} onPress={handlePublish}>
            <Text style={styles.buttonText}>Post to Feed</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 30 }}>
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

          {posts.map((post) => (
            <View
              key={post.id}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                padding: 15,
                borderRadius: 15,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontWeight: "bold", color: "#0191d6" }}>
                {post.author}
              </Text>
              <Text style={{ color: "#333", marginTop: 5 }}>{post.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 80 },
  title: { fontSize: 28, fontWeight: "bold", color: "white", marginBottom: 20 },
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
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
