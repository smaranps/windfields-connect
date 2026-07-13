import React, { useState, useEffect } from "react";
import { Stack, router } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function EventsScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);
  const getFormattedDate = (dateObj: Date) => {
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getFormattedTime = (timeObj: Date) => {
    return timeObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleCreateEvent = async () => {
    if (!title.trim() || !location.trim()) {
      Alert.alert("Missing Fields", "Please fill in the title and location.");
      return;
    }

    setIsPublishing(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("No user logged in");
      const userDoc = await getDoc(doc(db, "users", uid));
      const userData = userDoc.data();
      const displayName = userData?.username || "Neighbor";
      const userProfilePic =
        userData?.profilePicUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

      await addDoc(collection(db, "events"), {
        title: title.trim(),
        description: description.trim(),
        date: getFormattedDate(date),
        time: getFormattedTime(time),
        rawDateString: `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        location: location.trim(),
        author: displayName,
        authorProfilePic: userProfilePic,
        userId: uid,
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setDescription("");
      setLocation("");
      setDate(new Date());
      setTime(new Date());
      Alert.alert("Success", "Neighborhood event posted.");
    } catch (e) {
      console.error("Error adding event:", e);
      Alert.alert("Error", "Could not save event details.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      "Cancel Event",
      "Are you sure you want to pull down this event listing?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "events", eventId));
            } catch (error) {
              console.error(error);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={["#0191d6", "#06c9c1"]} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableOpacity style={styles.BackButton} onPress={() => router.back()}>
        <IconSymbol name="chevron.left" size={20} color="#111827" />
      </TouchableOpacity>

      <ScrollView style={styles.container}>
        <Text style={styles.screenTitle}>Host an Event</Text>
        <View style={styles.formCard}>
          <TextInput
            placeholder="Event Title (e.g., Backyard Garage Sale)"
            value={title}
            onChangeText={setTitle}
            style={styles.singleInput}
            placeholderTextColor="#999"
          />
          <TextInput
            placeholder="Description (What should neighbors bring?)"
            multiline
            value={description}
            onChangeText={setDescription}
            style={[
              styles.singleInput,
              { height: 60, textAlignVertical: "top" },
            ]}
            placeholderTextColor="#999"
          />
          <View style={styles.rowInputs}>
            <TouchableOpacity
              style={styles.pickerSelectorButton}
              onPress={() => setShowDatePicker(true)}
            >
              <IconSymbol name="calendar" size={16} color="#0191d6" />
              <Text style={styles.pickerButtonText}>
                {getFormattedDate(date)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerSelectorButton}
              onPress={() => setShowTimePicker(true)}
            >
              <IconSymbol name="clock" size={16} color="#06c9c1" />
              <Text style={styles.pickerButtonText}>
                {getFormattedTime(time)}
              </Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === "ios");
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              is24Hour={false}
              onChange={(event, selectedTime) => {
                setShowTimePicker(Platform.OS === "ios");
                if (selectedTime) setTime(selectedTime);
              }}
            />
          )}

          <TextInput
            placeholder="Location"
            value={location}
            onChangeText={setLocation}
            style={styles.singleInput}
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[styles.submitButton, isPublishing && { opacity: 0.6 }]}
            onPress={handleCreateEvent}
            disabled={isPublishing}
          >
            <Text style={styles.submitButtonText}>Schedule Event</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionHeader}>Upcoming Events</Text>

        {events.map((item) => {
          const isMyEvent = item.userId === auth.currentUser?.uid;
          return (
            <View key={item.id} style={styles.eventCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.eventTitleText}>{item.title}</Text>
                {isMyEvent && (
                  <TouchableOpacity onPress={() => handleDeleteEvent(item.id)}>
                    <IconSymbol name="trash" size={18} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>
              {item.description ? (
                <Text style={styles.descriptionText}>{item.description}</Text>
              ) : null}
              <View style={styles.badgeContainer}>
                <View style={styles.infoBadge}>
                  <IconSymbol name="calendar" size={14} color="#0191d6" />
                  <Text style={styles.badgeText}>
                    {item.date} @ {item.time}
                  </Text>
                </View>
                <View style={styles.infoBadge}>
                  <IconSymbol
                    name="mappin.and.ellipse"
                    size={14}
                    color="#06c9c1"
                  />
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.authorText}>
                  Organized by @{item.author}
                </Text>
              </View>
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 80,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginTop: 30,
    marginBottom: 30,
  },
  formCard: {
    backgroundColor: "lightblue",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  singleInput: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  pickerSelectorButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  pickerButtonText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#0191d6",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  sectionHeader: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 30,
    marginBottom: 15,
  },
  eventCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  eventTitleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
    lineHeight: 20,
  },
  badgeContainer: {
    gap: 8,
    marginBottom: 12,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  badgeText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
    alignItems: "flex-start",
  },
  authorText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
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
