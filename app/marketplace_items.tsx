import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";

export default function MarketplaceFeed() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteListing = (listingId: string) => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to remove this item from the marketplace?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "listings", listingId));
            } catch (error) {
              console.error("Error deleting listing: ", error);
              Alert.alert("Error", "Could not delete the listing. Try again.");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <LinearGradient colors={["#0191d6", "#06c9c1"]} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.circularButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Marketplace</Text>
          <TouchableOpacity
            style={styles.circularButton}
            onPress={() => router.push("/marketplace")}
          >
            <IconSymbol name="plus" size={20} color="#0191d6" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="white" style={{ flex: 1 }} />
        ) : listings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items for sale yet.</Text>
            <Text style={styles.emptySubtext}>
              Be the first neighbor to list something!
            </Text>
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isMyListing = item.sellerId === auth.currentUser?.uid;

              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => {
                    router.push({
                      pathname: "/marketplace_details",
                      params: {
                        id: item.id,
                        title: item.title,
                        price: item.price,
                        image: encodeURIComponent(item.image),
                        description: item.description,
                        sellerName: item.sellerName,
                        sellerId: item.sellerId,
                      },
                    });
                  }}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.cardImage}
                  />

                  {isMyListing && (
                    <TouchableOpacity
                      style={styles.deleteBadge}
                      onPress={() => handleDeleteListing(item.id)}
                    >
                      <IconSymbol name="trash.fill" size={14} color="#ff4444" />
                    </TouchableOpacity>
                  )}

                  <View style={styles.cardContent}>
                    <Text style={styles.priceTag}>${item.price}</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.sellerText} numberOfLines={1}>
                      👤 {item.sellerName}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15, paddingTop: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 20,
  },
  circularButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "48%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardImage: {
    width: "100%",
    height: 140,
    resizeMode: "cover",
  },
  cardContent: {
    padding: 12,
  },
  priceTag: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0191d6",
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  sellerText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 5,
  },
  deleteBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
