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
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { AppIcon } from "@/app/components/icon";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { useBlockedUsers } from "@/app/components/blocked";

const REPORT_REASONS = [
  "Prohibited Item",
  "Scam or Fraud",
  "Inappropriate Content",
  "Misleading Description",
  "Other",
];

export default function MarketplaceFeed() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const blockedUsers = useBlockedUsers();

  const [selectedReportItem, setSelectedReportItem] = useState<any | null>(
    null
  );
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

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

  const visibleListings = listings.filter(
    (item) => !blockedUsers.includes(item.sellerId)
  );

  const handleBlockUser = async (targetUserId: string, sellerName: string) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    Alert.alert(
      `Block @${sellerName}?`,
      "You will no longer see marketplace listings, posts, or comments from this seller.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block Seller",
          style: "destructive",
          onPress: async () => {
            try {
              const userRef = doc(db, "users", currentUserId);
              await updateDoc(userRef, {
                blockedUsers: arrayUnion(targetUserId),
              });
              Alert.alert("Seller Blocked", `You have blocked @${sellerName}.`);
            } catch (error) {
              console.error("Error blocking seller:", error);
              Alert.alert("Error", "Could not block seller. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleSellerOptions = (targetUserId: string, sellerName: string) => {
    if (targetUserId === auth.currentUser?.uid) return;

    Alert.alert(
      `Seller Options: @${sellerName}`,
      "What would you like to do?",
      [
        {
          text: "Block Seller",
          style: "destructive",
          onPress: () => handleBlockUser(targetUserId, sellerName),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const submitListingReport = async () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !selectedReportItem) return;

    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, "reports"), {
        reporterId: currentUserId,
        reportedUserId: selectedReportItem.sellerId || null,
        targetId: selectedReportItem.id || null,
        targetType: "marketplace_listing",
        itemTitle: selectedReportItem.title || "",
        reason: selectedReason,
        details: additionalDetails.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Report Submitted",
        "Thank you for keeping our neighborhood marketplace safe. Our team will review this item."
      );

      setAdditionalDetails("");
      setSelectedReason(REPORT_REASONS[0]);
      setSelectedReportItem(null);
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <LinearGradient colors={["#0191d6", "#06c9c1"]} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.circularButton}
            onPress={() => router.back()}
          >
            <AppIcon
              sfName="chevron.left"
              lucideName="ChevronLeft"
              size={20}
              color="#111827"
            />
          </TouchableOpacity>
          <Text style={styles.title}>Marketplace</Text>
          <TouchableOpacity
            style={styles.circularButton}
            onPress={() => router.push("/marketplace")}
          >
            <AppIcon
              sfName="plus"
              lucideName="Plus"
              size={20}
              color="#0191d6"
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="white" style={{ flex: 1 }} />
        ) : visibleListings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items for sale yet.</Text>
            <Text style={styles.emptySubtext}>
              Be the first neighbor to list something!
            </Text>
          </View>
        ) : (
          <FlatList
            data={visibleListings}
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

                  {isMyListing ? (
                    <TouchableOpacity
                      style={styles.actionBadge}
                      onPress={() => handleDeleteListing(item.id)}
                    >
                      <AppIcon
                        sfName="trash.fill"
                        lucideName="Trash2"
                        size={14}
                        color="#ff4444"
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.actionBadge}
                      onPress={() => setSelectedReportItem(item)}
                    >
                      <AppIcon
                        sfName="flag.fill"
                        lucideName="Flag"
                        size={13}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  )}

                  <View style={styles.cardContent}>
                    <Text style={styles.priceTag}>${item.price}</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        handleSellerOptions(item.sellerId, item.sellerName)
                      }
                      activeOpacity={isMyListing ? 1 : 0.7}
                    >
                      <Text style={styles.sellerText} numberOfLines={1}>
                        👤 {item.sellerName || "Neighbor"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* REPORT LISTING MODAL */}
      <Modal
        visible={selectedReportItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReportItem(null)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report Item</Text>
                <TouchableOpacity onPress={() => setSelectedReportItem(null)}>
                  <AppIcon
                    sfName="xmark"
                    lucideName="X"
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Why are you reporting "{selectedReportItem?.title}" by @
                {selectedReportItem?.sellerName}?
              </Text>

              <View style={styles.reasonsContainer}>
                {REPORT_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonChip,
                        isSelected && styles.selectedChip,
                      ]}
                      onPress={() => setSelectedReason(reason)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.selectedChipText,
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>
                Additional Context (Optional)
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Explain why this listing violates marketplace rules..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                maxLength={300}
                value={additionalDetails}
                onChangeText={setAdditionalDetails}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setSelectedReportItem(null)}
                  disabled={isSubmittingReport}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isSubmittingReport && { opacity: 0.6 },
                  ]}
                  onPress={submitListingReport}
                  disabled={isSubmittingReport}
                >
                  <Text style={styles.submitText}>
                    {isSubmittingReport ? "Submitting..." : "Submit Report"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  actionBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
  },
  reasonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  reasonChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectedChip: {
    backgroundColor: "#e0f2fe",
    borderColor: "#0191d6",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  selectedChipText: {
    color: "#0191d6",
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    height: 70,
    textAlignVertical: "top",
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "600",
    color: "#64748b",
    fontSize: 14,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  submitText: {
    fontWeight: "700",
    color: "white",
    fontSize: 14,
  },
});
