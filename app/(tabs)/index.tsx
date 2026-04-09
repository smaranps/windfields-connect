import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        Windfields Connect
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/signup")}
        style={{
          marginTop: 20,
          backgroundColor: "#0191d6",
          padding: 15,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white" }}>Create an Account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/login")}
        style={{
          marginTop: 20,
          backgroundColor: "#0191d6",
          padding: 15,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white" }}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}
