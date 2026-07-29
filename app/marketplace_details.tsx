import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AppIcon } from "@/app/components/icon";
import { auth, db } from "../services/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

const REPORT_REASONS = [
  "Inappropriate Content",
  "Spam or Fraud",
  "Misleading Information",
  "Prohibited Item",
  "Other",
];

export default function ListingDetail() {
  const router = useRouter();

  const params = useLocalSearchParams();
  const { id, title, price, image, description, sellerName, sellerId } = params;

  const isMyListing = sellerId === auth.currentUser?.uid;

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this ${title} on Windfields Connect!`,
      });
    } catch (error) {
      console.error("Error sharing: ", error);
    }
  };

  const handleOpenReportModal = () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      Alert.alert(
        "Authentication Required",
        "Please log in to report a listing."
      );
      return;
    }
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        reporterId: currentUserId,
        reportedUserId: sellerId || null,
        targetId: id || null,
        targetType: "marketplace_listing",
        title: title || "",
        reason: selectedReason,
        details: additionalDetails.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Report Submitted",
        "Thank you for notifying us. Our team will review this listing shortly."
      );

      setAdditionalDetails("");
      setSelectedReason(REPORT_REASONS[0]);
      setReportModalVisible(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockSeller = async () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      Alert.alert("Authentication Required", "Please log in to block sellers.");
      return;
    }

    if (isMyListing) return;

    Alert.alert(
      `Block @${sellerName}?`,
      "You will no longer see posts or listings from this user.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block User",
          style: "destructive",
          onPress: async () => {
            try {
              const userRef = doc(db, "users", currentUserId);
              await updateDoc(userRef, {
                blockedUsers: arrayUnion(sellerId),
              });
              Alert.alert("User Blocked", `You have blocked @${sellerName}.`);
              router.back();
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert("Error", "Could not block user. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleSellerBadgePress = () => {
    if (isMyListing) return;

    Alert.alert(
      `Seller Options: @${sellerName}`,
      "What would you like to do?",
      [
        {
          text: "Block Seller",
          style: "destructive",
          onPress: handleBlockSeller,
        },
        {
          text: "Report Listing",
          onPress: handleOpenReportModal,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
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
          <AppIcon
            sfName="chevron.left"
            lucideName="ChevronLeft"
            size={20}
            color="#111827"
          />
        </TouchableOpacity>

        <View style={styles.rightActions}>
          {isMyListing ? (
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
              <AppIcon
                sfName="pencil"
                lucideName="Pencil"
                size={18}
                color="#0191d6"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.circularButton}
              onPress={handleOpenReportModal}
            >
              <AppIcon
                sfName="flag.fill"
                lucideName="Flag"
                size={18}
                color="#ef4444"
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.circularButton} onPress={handleShare}>
            <AppIcon
              sfName="square.and.arrow.up"
              lucideName="Share"
              size={20}
              color="#111827"
            />
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
            <TouchableOpacity
              style={styles.sellerBadge}
              onPress={handleSellerBadgePress}
              activeOpacity={isMyListing ? 1 : 0.7}
            >
              <AppIcon
                sfName="person.fill"
                lucideName="User"
                size={16}
                color="gray"
              />
              <Text style={styles.sellerText}>Listed by {sellerName}</Text>
            </TouchableOpacity>
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
              <AppIcon
                sfName="exclamationmark.triangle"
                lucideName="AlertTriangle"
                color="green"
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
              <AppIcon
                sfName="bubble.left.and.bubble.right.fill"
                lucideName="MessageSquare"
                size={18}
                color="white"
              />
              <Text style={styles.buttonText}>Message Seller</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report Listing</Text>
                <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                  <AppIcon
                    sfName="xmark"
                    lucideName="X"
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Why are you reporting "{title}"?
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
                Additional Details (Optional)
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Provide details for our moderation team..."
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
                  onPress={() => setReportModalVisible(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isSubmitting && { opacity: 0.6 },
                  ]}
                  onPress={submitReport}
                  disabled={isSubmitting}
                >
                  <Text style={styles.submitText}>
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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

  // Modal Styles
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
    fontSize: 14,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
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
    height: 80,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "600",
    color: "#64748b",
    fontSize: 15,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  submitText: {
    fontWeight: "700",
    color: "white",
    fontSize: 15,
  },
});
