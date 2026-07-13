import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Stack } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 56) / 2;

export default function TabTwoScreen() {
  const [userName, setUserName] = useState("User");
  const [searchQuery, setSearchQuery] = useState("");
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

  const postImage =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPVZtQyB3qTlxAY84Fnr0ADYk8YvYWhmA0bw&s";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#0191d6", "#06c9c1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0 }}
        style={styles.headerBanner}
      >
        <View style={styles.headerTextRow}>
          <View>
            <Text style={styles.welcomeText}>Hello {userName}!</Text>
            <Text style={styles.subtitleText}>
              Start by setting up an event
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBadge}
            onPress={() => router.push("/maps")}
          >
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={18}
              color="white"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBarContainer}>
          <IconSymbol
            name="magnifyingglass"
            size={16}
            color="#8E8E93"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search events, alerts, or posts..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Get Started Below!</Text>
          <TouchableOpacity onPress={() => router.push("/events")}>
            <Text style={styles.seeAllText}>see all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.contentCard}
            onPress={() => router.push("/post-event")}
          >
            <Image source={{ uri: postImage }} style={styles.cardImage} />
            <View style={styles.cardFooter}>
              <Text style={styles.cardTitle}>Post</Text>
              <View style={[styles.brandPill, { backgroundColor: "#FFEFE6" }]}>
                <IconSymbol
                  name="square.and.pencil"
                  size={11}
                  color="#FF6A00"
                />
                <Text style={[styles.brandPillText, { color: "#FF6A00" }]}>
                  Create
                </Text>
                <IconSymbol
                  name="chevron.right"
                  size={10}
                  color="#FF6A00"
                  style={styles.arrowIcon}
                />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contentCard}
            onPress={() => router.push("/events")}
          >
            <Image
              source={{
                uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR16w_tSZ542LW1UJx5GCnawJM2WIF0wwpk-w&s",
              }}
              style={styles.cardImage}
            />
            <View style={styles.cardFooter}>
              <Text style={styles.cardTitle}>Event</Text>
              <View style={[styles.brandPill, { backgroundColor: "#EBF5FF" }]}>
                <IconSymbol name="calendar" size={11} color="#007AFF" />
                <Text style={[styles.brandPillText, { color: "#007AFF" }]}>
                  Schedule
                </Text>
                <IconSymbol
                  name="chevron.right"
                  size={10}
                  color="#007AFF"
                  style={styles.arrowIcon}
                />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contentCard}
            onPress={() => router.push("/calendar")}
          >
            <Image
              source={{
                uri: "https://t3.ftcdn.net/jpg/02/77/18/82/360_F_277188285_BmZ7gYMS6mefo8uFUDTwtaeFZpgI5Dz6.jpg",
              }}
              style={styles.cardImage}
            />
            <View style={styles.cardFooter}>
              <Text style={styles.cardTitle}>My Calendar</Text>
              <View style={[styles.brandPill, { backgroundColor: "#EAFCEF" }]}>
                <IconSymbol name="clock.fill" size={11} color="#34C759" />
                <Text style={[styles.brandPillText, { color: "#34C759" }]}>
                  Agenda
                </Text>
                <IconSymbol
                  name="chevron.right"
                  size={10}
                  color="#34C759"
                  style={styles.arrowIcon}
                />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contentCard}
            onPress={() => router.push("/signup")}
          >
            <Image
              source={{
                uri: "https://static.vecteezy.com/system/resources/previews/009/262/854/non_2x/bright-decorative-background-with-mandala-pattern-blank-for-postcard-invitation-banner-with-place-for-text-illustration-vector.jpg",
              }}
              style={styles.cardImage}
            />
            <View style={styles.cardFooter}>
              <Text style={styles.cardTitle}>Invite</Text>
              <View style={[styles.brandPill, { backgroundColor: "#FFF9E6" }]}>
                <IconSymbol name="envelope.fill" size={11} color="#FFCC00" />
                <Text style={[styles.brandPillText, { color: "#FFCC00" }]}>
                  Private
                </Text>
                <IconSymbol
                  name="chevron.right"
                  size={10}
                  color="#FFCC00"
                  style={styles.arrowIcon}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeadingBottom}>Local Updates</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          <TouchableOpacity
            style={styles.utilRowButton}
            onPress={() => router.push("/signup")}
          >
            <Image
              source={{
                uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4kVc1SsMwrYrX9CMSCPwO_AHHfOHvDVvtRg&s",
              }}
              style={styles.utilImageCircle}
            />
            <View>
              <Text style={styles.utilTitle}>News Feed</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilRowButton}
            onPress={() => router.push("/maps")}
          >
            <View
              style={[
                styles.utilImageCircle,
                {
                  backgroundColor: "#EBF5FF",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <IconSymbol name="map.fill" size={18} color="#007AFF" />
            </View>
            <View>
              <Text style={styles.utilTitle}>Live Map</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerBanner: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginTop: 2,
  },
  notificationBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 110,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  sectionHeadingBottom: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 28,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  contentCard: {
    width: CARD_WIDTH,
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  cardImage: {
    width: "100%",
    height: 120,
  },
  cardFooter: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
    width: "100%",
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
    flex: 1,
  },
  arrowIcon: {
    alignSelf: "flex-end",
  },
  horizontalScroll: {
    gap: 16,
  },
  utilRowButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  utilImageCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  utilTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
});
