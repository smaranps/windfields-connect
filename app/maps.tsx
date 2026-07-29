import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { doc, deleteDoc } from "firebase/firestore";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { AppIcon } from "@/app/components/icon";

const INITIAL_REGION = {
  latitude: 43.8975,
  longitude: -78.8658,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export default function SafetyMapScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeAlerts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAlerts(activeAlerts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleMapLongPress = (e: any) => {
    const { coordinate } = e.nativeEvent;
    setSelectedCoords(coordinate);
    setModalVisible(true);
  };

  const handleMapPress = () => {
    if (selectedAlert) setSelectedAlert(null);
  };

  const handleCreateAlert = async () => {
    if (!newTitle.trim() || !newDescription.trim() || !selectedCoords) {
      Alert.alert("Missing Info", "Please fill out all fields.");
      return;
    }

    try {
      const username = auth.currentUser?.displayName || "Neighbor";

      await addDoc(collection(db, "alerts"), {
        title: newTitle.trim(),
        description: newDescription.trim(),
        severity: severity,
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
        author: username,
        createdAt: serverTimestamp(),
      });

      setModalVisible(false);
      setNewTitle("");
      setNewDescription("");
      setSeverity("medium");
      setSelectedCoords(null);
      Alert.alert("Alert Dropped", "Your safety pin is live on the map.");
    } catch (error) {
      console.error("Error pinning alert:", error);
      Alert.alert("Error", "Could not drop pin.");
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    Alert.alert("Delete Alert?", "Remove this pin from the community grid?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "alerts", alertId));
            setSelectedAlert(null);
          } catch (error) {
            console.error("Error clearing pin:", error);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0191d6" />
          <Text style={styles.loaderText}>Loading grid...</Text>
        </View>
      ) : (
        <MapView
          style={styles.map}
          provider={
            Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
          }
          initialRegion={INITIAL_REGION}
          onLongPress={handleMapLongPress}
          onPress={handleMapPress}
          showsUserLocation={true}
        >
          {alerts.map((alert) => {
            const isUrgent = alert.severity === "high";
            const pinColor = isUrgent ? "#FF3B30" : "#FF9500";

            return (
              <Marker
                key={alert.id}
                coordinate={{
                  latitude: alert.latitude,
                  longitude: alert.longitude,
                }}
                pinColor={pinColor}
                onPress={() => setSelectedAlert(alert)}
              />
            );
          })}
        </MapView>
      )}

      <TouchableOpacity style={styles.BackButton} onPress={() => router.back()}>
        <AppIcon
          sfName="chevron.left"
          lucideName="ChevronLeft"
          size={20}
          color="#111827"
        />
      </TouchableOpacity>

      <View style={styles.floatingHeader}>
        <Text style={styles.headerTitle}>Safety & Alerts Map</Text>
        <Text style={styles.headerSubtitle}>
          Hold down at any point on the map to drop a pin.
        </Text>
      </View>
      {selectedAlert && (
        <View style={styles.selectedCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <AppIcon
                sfName={
                  selectedAlert.severity === "high"
                    ? "exclamationmark.triangle.fill"
                    : "info.circle.fill"
                }
                lucideName={
                  selectedAlert.severity === "high" ? "AlertTriangle" : "Info"
                }
                size={20}
                color={
                  selectedAlert.severity === "high" ? "#FF3B30" : "#FF9500"
                }
              />
              <Text style={styles.cardTitle}>{selectedAlert.title}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedAlert(null)}
              style={styles.closeBtn}
            >
              <AppIcon
                sfName="xmark"
                lucideName="X"
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardDesc}>{selectedAlert.description}</Text>

          <View style={styles.cardFooter}>
            <Text style={styles.cardAuthor}>
              ⚠️ Reported by @{selectedAlert.author}
            </Text>
            <TouchableOpacity
              style={styles.deleteCardBtn}
              onPress={() => handleDeleteAlert(selectedAlert.id)}
            >
              <AppIcon
                sfName="trash.fill"
                lucideName="Trash2"
                size={14}
                color="#EF4444"
              />
              <Text style={styles.deleteCardText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Report Hazard / Alert</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Hazard Title (e.g., Downed Powerline)"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  placeholder="Description details..."
                  multiline
                  value={newDescription}
                  onChangeText={setNewDescription}
                />
                <Text style={styles.label}>Severity Level:</Text>
                <View style={styles.severityRow}>
                  <TouchableOpacity
                    style={[
                      styles.sevButton,
                      severity === "medium" && styles.sevMediumActive,
                    ]}
                    onPress={() => setSeverity("medium")}
                  >
                    <Text style={styles.sevButtonText}>🟠 Moderate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sevButton,
                      severity === "high" && styles.sevHighActive,
                    ]}
                    onPress={() => setSeverity("high")}
                  >
                    <Text
                      style={[
                        styles.sevButtonText,
                        severity === "high" && { color: "white" },
                      ]}
                    >
                      🔴 High Danger
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleCreateAlert}
                  >
                    <Text style={styles.submitBtnText}>Drop Pin</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loaderText: { fontSize: 15, color: "#666", fontWeight: "500" },
  floatingHeader: {
    position: "absolute",
    top: 60,
    left: 70,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  headerSubtitle: {
    fontSize: 12,
    color: "#0191d6",
    marginTop: 2,
    fontWeight: "600",
    textAlign: "center",
  },
  BackButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(235, 235, 235, 0.9)",
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
  selectedCard: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  cardDesc: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  cardAuthor: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  deleteCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  deleteCardText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  severityRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  sevButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  sevMediumActive: { backgroundColor: "#FFEFD6", borderColor: "#FF9500" },
  sevHighActive: { backgroundColor: "#FF3B30", borderColor: "#FF3B30" },
  sevButtonText: { fontWeight: "600", fontSize: 13 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: { fontWeight: "600", color: "#4B5563" },
  submitBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#0191d6",
  },
  submitBtnText: { fontWeight: "600", color: "white" },
});
