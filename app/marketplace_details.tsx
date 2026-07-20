import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { auth } from "../services/firebaseConfig";

export default function ListingDetail() {
  const router = useRouter();

  const params = useLocalSearchParams();
  const { id, title, price, image, description, sellerName, sellerId } = params;

  const isMyListing = sellerId === auth.currentUser?.uid;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this ${title} on Windfields Connect!`,
      });
    } catch (error) {
      console.error("Error sharing: ", error);
    }
  };

  const handleContactSeller = () => {
    if (isMyListing) {
      Alert.alert(
        "Your Item",
        "You cannot message yourself about your own listing!"
      );
      return;
    }

    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      Alert.alert(
        "Authentication Required",
        "Please log in to chat with the seller."
      );
      return;
    }

    router.push({
      pathname: "/messages",
      params: {
        listingId: id as string,
        listingTitle: title as string,
        sellerId: sellerId as string,
        sellerName: sellerName as string,
        buyerId: currentUserId,
        buyerName: auth.currentUser?.displayName || "Neighbor",
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f0f7fa" }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.floatingHeader}>
        <TouchableOpacity
          style={styles.circularButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color="#111827" />
        </TouchableOpacity>

        <View style={styles.rightActions}>
          {isMyListing && (
            <TouchableOpacity
              style={styles.circularButton}
              onPress={() => {
                router.push({
                  pathname: "/marketplace",
                  params: {
                    id: id as string,
                    title: title as string,
                    price: price as string,
                    image: image as string,
                    description: description as string,
                    isEditing: "true",
                  },
                });
              }}
            >
              <IconSymbol name="pencil" size={18} color="#0191d6" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.circularButton} onPress={handleShare}>
            <IconSymbol name="square.and.arrow.up" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Image source={{ uri: image as string }} style={styles.mainImage} />

        <View style={styles.detailsContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.priceTag}>${price}</Text>
            <View style={styles.sellerBadge}>
              <IconSymbol name="person.fill" size={16} color="gray" />
              <Text style={styles.sellerText}>Listed by {sellerName}</Text>
            </View>
          </View>

          <Text style={styles.itemTitle}>{title}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionHeading}>Description</Text>
          <Text style={styles.descriptionText}>
            {description || "No additional description provided by the seller."}
          </Text>

          <View style={styles.divider} />

          <View style={styles.safetyBox}>
            <Text style={styles.safetyTitle}>
              <IconSymbol
                name="exclamationmark.triangle"
                color={"green"}
                size={16}
              />{" "}
              Safe Meetup Tip
            </Text>
            <Text style={styles.safetyText}>
              Always arrange meetups in a public place like a nearby school
              parking lot or park and pay in cash when you inspect the item in
              person.
            </Text>
          </View>
        </View>
      </ScrollView>

      {!isMyListing && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleContactSeller}
          >
            <LinearGradient
              colors={["#0191d6", "#06c9c1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <IconSymbol
                name="bubble.left.and.bubble.right.fill"
                size={18}
                color="white"
              />
              <Text style={styles.buttonText}>Message Seller</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingHeader: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  rightActions: {
    flexDirection: "row",
    gap: 10,
  },
  circularButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  mainImage: {
    width: "100%",
    height: 380,
    resizeMode: "cover",
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: "#f0f7fa",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priceTag: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0191d6",
  },
  sellerBadge: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  sellerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 32,
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: "#475569",
    lineHeight: 24,
  },
  safetyBox: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
  },
  safetyTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 4,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  safetyText: {
    fontSize: 13,
    color: "#15803d",
    lineHeight: 18,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center",
  },
  messageButton: {
    width: "100%",
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 15,
    gap: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
