import {
  ScrollView,
  Text,
  View,
  ImageBackground,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function TabTwoScreen() {
  const [userName, setUserName] = useState("User");
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserName(docSnap.data().username);
        }
      }
    };
    fetchUser();
  }, []);
  const images =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPVZtQyB3qTlxAY84Fnr0ADYk8YvYWhmA0bw&s";
  return (
    <LinearGradient
      colors={["#0191d6", "#06c9c1"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 0 }}
      style={{
        flex: 1,
      }}
    >
      <ScrollView
        style={{
          display: "flex",
        }}
      >
        <Text
          style={{
            marginTop: 70,
            fontSize: 35,
            fontWeight: "bold",
            fontFamily: "sans-serif",
            color: "white",
            textAlign: "left",
            alignSelf: "flex-start",
            marginLeft: 30,
          }}
        >
          Hello {userName}!
        </Text>
        <Text
          style={{
            marginTop: 3,
            fontSize: 20,
            fontWeight: "500",
            fontFamily: "sans-serif",
            color: "white",
            textAlign: "left",
            alignSelf: "flex-start",
            marginLeft: 30,
          }}
        >
          Start by setting up an event
        </Text>
        <StatusBar barStyle="dark-content"></StatusBar>
        <View
          style={{
            width: "100%",
            alignItems: "center",
            justifyContent: "flex-start",
            margin: "auto",
            marginTop: 40,
            backgroundColor: "white",
            height: "90%",
            borderRadius: 50,
          }}
        >
          <View
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexDirection: "row",
              gap: 20,
              marginTop: 40,
            }}
          >
            <TouchableOpacity style={{}}>
              <Link href={"/post-event"}>
                <ImageBackground
                  source={{ uri: images }}
                  style={{
                    width: 160,
                    height: 160,

                    justifyContent: "flex-end",
                  }}
                  imageStyle={{ borderRadius: 30 }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 30,
                      fontWeight: "bold",
                      alignSelf: "center",
                    }}
                  >
                    Post
                  </Text>
                </ImageBackground>
              </Link>
            </TouchableOpacity>
            <TouchableOpacity style={{}}>
              <Link href={"/login"}>
                <ImageBackground
                  source={{
                    uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR16w_tSZ542LW1UJx5GCnawJM2WIF0wwpk-w&s",
                  }}
                  style={{
                    width: 160,
                    height: 160,

                    justifyContent: "flex-end",
                  }}
                  imageStyle={{ borderRadius: 30 }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 30,
                      fontWeight: "bold",
                      alignSelf: "center",
                    }}
                  >
                    Event
                  </Text>
                </ImageBackground>
              </Link>
            </TouchableOpacity>
          </View>
          <View
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-evenly",
              flexDirection: "row",
              gap: 20,
              marginTop: 25,
            }}
          >
            <TouchableOpacity style={{}}>
              <Link href={"/signup"}>
                <ImageBackground
                  source={{
                    uri: "https://t3.ftcdn.net/jpg/02/77/18/82/360_F_277188285_BmZ7gYMS6mefo8uFUDTwtaeFZpgI5Dz6.jpg",
                  }}
                  style={{
                    width: 160,
                    height: 160,

                    justifyContent: "flex-end",
                  }}
                  imageStyle={{ borderRadius: 30 }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 25,
                      fontWeight: "bold",
                      alignSelf: "center",
                    }}
                  >
                    My Calendar
                  </Text>
                </ImageBackground>
              </Link>
            </TouchableOpacity>
            <TouchableOpacity style={{}}>
              <Link href={"/signup"}>
                <ImageBackground
                  source={{
                    uri: "https://static.vecteezy.com/system/resources/previews/009/262/854/non_2x/bright-decorative-background-with-mandala-pattern-blank-for-postcard-invitation-banner-with-place-for-text-illustration-vector.jpg",
                  }}
                  style={{
                    width: 160,
                    height: 160,

                    justifyContent: "flex-end",
                  }}
                  imageStyle={{ borderRadius: 30 }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 30,
                      fontWeight: "bold",
                      alignSelf: "center",
                    }}
                  >
                    Invite
                  </Text>
                </ImageBackground>
              </Link>
            </TouchableOpacity>
          </View>
          <View
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexDirection: "row",
              gap: 20,
              marginTop: 25,
            }}
          >
            <TouchableOpacity style={{}}>
              <Link href={"/signup"}>
                <ImageBackground
                  source={{
                    uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4kVc1SsMwrYrX9CMSCPwO_AHHfOHvDVvtRg&s",
                  }}
                  style={{
                    width: 160,
                    height: 160,

                    justifyContent: "flex-end",
                  }}
                  imageStyle={{ borderRadius: 30 }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 25,
                      fontWeight: "bold",
                      alignSelf: "center",
                    }}
                  >
                    News
                  </Text>
                </ImageBackground>
              </Link>
            </TouchableOpacity>
            <TouchableOpacity style={{}}>
              <Link href={"/signup"}>
                <ImageBackground
                  source={{
                    uri: "data:image/jpeg;base64,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",
                  }}
                  style={{
                    width: 160,
                    height: 160,
                    justifyContent: "flex-end",
                  }}
                  imageStyle={{ borderRadius: 30 }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 30,
                      fontWeight: "bold",
                      alignSelf: "center",
                    }}
                  >
                    Maps
                  </Text>
                </ImageBackground>
              </Link>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
