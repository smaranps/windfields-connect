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
  Callout,
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
          // Automatically uses Google Maps on Android and Apple Maps on iOS
          provider={
            Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
          }
          initialRegion={INITIAL_REGION}
          onLongPress={handleMapLongPress}
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
                onCalloutPress={() => handleDeleteAlert(alert.id)}
                pinColor={pinColor}
              >
                <Callout tooltip>
                  <View style={styles.calloutBubble}>
                    <View style={styles.calloutHeader}>
                      <AppIcon
                        sfName={
                          isUrgent
                            ? "exclamationmark.triangle.fill"
                            : "info.circle.fill"
                        }
                        lucideName={isUrgent ? "AlertTriangle" : "Info"}
                        size={16}
                        color={pinColor}
                      />
                      <Text style={styles.calloutTitle}>{alert.title}</Text>
                    </View>

                    <Text style={styles.calloutDesc}>{alert.description}</Text>

                    <TouchableOpacity
                      style={styles.calloutDeleteButton}
                      onPress={() => handleDeleteAlert(alert.id)}
                    >
                      <AppIcon
                        sfName="trash.fill"
                        lucideName="Trash2"
                        size={12}
                        color="#EF4444"
                      />
                      <Text style={styles.deleteText}>Remove Pin</Text>
                    </TouchableOpacity>

                    <View style={styles.calloutFooter}>
                      <Text style={styles.calloutTime}>
                        ⚠️ By @{alert.author}
                      </Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
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
  calloutBubble: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    width: 220,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  calloutTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  calloutDesc: { fontSize: 13, color: "#4B5563", lineHeight: 18 },
  calloutFooter: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 6,
  },
  calloutTime: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
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
  calloutDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "700",
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
});
