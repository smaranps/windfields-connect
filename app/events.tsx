import React, { useState, useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Feather } from "@expo/vector-icons";
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
  setDoc,
  limit,
  getDocs,
} from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";

interface EventItemProps {
  item: {
    id: string;
    title: string;
    description?: string;
    date: string;
    time: string;
    location: string;
    author: string;
    userId: string;
  };
  isMyEvent: boolean;
  onDelete: (eventId: string) => void;
  currentUserId: string | undefined;
}

const EventItem: React.FC<EventItemProps> = ({
  item,
  isMyEvent,
  onDelete,
  currentUserId,
}) => {
  const [userStatus, setUserStatus] = useState<
    "going" | "maybe" | "declined" | null
  >(null);
  const [goingCount, setGoingCount] = useState(0);

  useEffect(() => {
    if (!item.id) return;
    const rsvpRef = collection(db, "events", item.id, "rsvps");

    const unsubscribe = onSnapshot(rsvpRef, (snapshot) => {
      let going = 0;
      let myStatus = null;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === "going") going++;
        if (doc.id === currentUserId) myStatus = data.status;
      });

      setGoingCount(going);
      setUserStatus(myStatus);
    });

    return () => unsubscribe();
  }, [item.id, currentUserId]);

  const handleRSVP = async (status: "going" | "maybe" | "declined") => {
    if (!currentUserId) return;
    setUserStatus(status);

    try {
      const rsvpDocRef = doc(db, "events", item.id, "rsvps", currentUserId);
      await setDoc(rsvpDocRef, {
        status: status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("RSVP Error:", error);
      Alert.alert("Error", "Could not save your RSVP.");
    }
  };

  return (
    <View style={styles.eventCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.eventTitleText}>{item.title}</Text>
        {isMyEvent && (
          <TouchableOpacity onPress={() => onDelete(item.id)}>
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
          <IconSymbol name="mappin.and.ellipse" size={14} color="#06c9c1" />
          <Text style={styles.badgeText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.authorText}>Organized by @{item.author}</Text>
        {goingCount > 0 && (
          <Text style={styles.goingCountText}>{goingCount} going</Text>
        )}
      </View>

      <View style={styles.rsvpContainer}>
        <TouchableOpacity
          style={[
            styles.rsvpBtn,
            userStatus === "going" && styles.rsvpGoingActive,
          ]}
          onPress={() => handleRSVP("going")}
        >
          <Feather
            name="check-circle"
            size={14}
            color={userStatus === "going" ? "#FFF" : "#10B981"}
          />
          <Text
            style={[
              styles.rsvpBtnText,
              { color: userStatus === "going" ? "#FFF" : "#10B981" },
            ]}
          >
            Going
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.rsvpBtn,
            userStatus === "maybe" && styles.rsvpMaybeActive,
          ]}
          onPress={() => handleRSVP("maybe")}
        >
          <Feather
            name="help-circle"
            size={14}
            color={userStatus === "maybe" ? "#FFF" : "#F59E0B"}
          />
          <Text
            style={[
              styles.rsvpBtnText,
              { color: userStatus === "maybe" ? "#FFF" : "#F59E0B" },
            ]}
          >
            Maybe
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.rsvpBtn,
            userStatus === "declined" && styles.rsvpDeclinedActive,
          ]}
          onPress={() => handleRSVP("declined")}
        >
          <Feather
            name="x-circle"
            size={14}
            color={userStatus === "declined" ? "#FFF" : "#6B7280"}
          />
          <Text
            style={[
              styles.rsvpBtnText,
              { color: userStatus === "declined" ? "#FFF" : "#6B7280" },
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function EventsScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isPrivate, setIsPrivate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  const [isCreatorVisible, setIsCreatorVisible] = useState(false);

  const currentUserUid = auth.currentUser?.uid;

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      const todayStr = new Date().toISOString().split("T")[0];

      fetchedEvents.forEach(async (event) => {
        if (event.rawDateString && event.rawDateString < todayStr) {
          try {
            await deleteDoc(doc(db, "events", event.id));
          } catch (error) {
            console.error("Error auto-deleting event:", error);
          }
        }
      });

      const visibleEvents = fetchedEvents.filter((event) => {
        if (!event.isPrivate) return true;
        const isCreator = event.userId === currentUserUid;
        const isInvited = event.invitedUIDs?.includes(currentUserUid);
        return isCreator || isInvited;
      });

      setEvents(visibleEvents);
    });

    return () => unsubscribe();
  }, [currentUserUid]);

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

  const sendBackgroundEmailInvites = async (
    eventTitle: string,
    eventDetails: string,
    eventDate: string,
    eventTime: string,
    eventLocation: string
  ) => {
    try {
      for (const user of selectedUsers) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userEmail = userDocSnap.data().email;

          if (userEmail) {
            await addDoc(collection(db, "mail"), {
              to: userEmail,
              message: {
                subject: `📅 You're Invited: ${eventTitle}!`,
                html: `
                  <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #0191d6;">Hey Neighbor! 👋</h2>
                    <p>You have been invited to a personal event by <strong>@${
                      auth.currentUser?.displayName || "a neighbor"
                    }</strong>:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; borderRadius: 10px; margin: 20px 0;">
                      <h3 style="margin-top: 0; color: #0191d6;">✨ ${eventTitle}</h3>
                      <p><strong>Description:</strong> ${
                        eventDetails || "No details provided."
                      }</p>
                      <p><strong>Date:</strong> ${eventDate} @ ${eventTime}</p>
                      <p><strong>Location:</strong> ${eventLocation}</p>
                    </div>
                    <p>Open the neighborhood app to RSVP!</p>
                  </div>
                `,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("Error triggering background emails:", error);
    }
  };

  const handleUserSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, limit(50));
      const querySnapshot = await getDocs(q);

      const tempResults: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const uData = docSnap.data();
        const username = uData.username || "";

        if (
          docSnap.id !== currentUserUid &&
          username.toLowerCase().includes(text.toLowerCase())
        ) {
          tempResults.push({ uid: docSnap.id, username });
        }
      });

      setSearchResults(tempResults.slice(0, 5));
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const selectUser = (user: any) => {
    if (!selectedUsers.some((u) => u.uid === user.uid)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeUser = (uid: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.uid !== uid));
  };

  const handleCreateEvent = async () => {
    if (!title.trim() || !location.trim()) {
      Alert.alert("Missing Fields", "Please fill in the title and location.");
      return;
    }

    setIsPublishing(true);
    try {
      if (!currentUserUid) throw new Error("No user logged in");
      const userDoc = await getDoc(doc(db, "users", currentUserUid));
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
        userId: currentUserUid,
        createdAt: serverTimestamp(),
        isPrivate: isPrivate,
        invitedUIDs: isPrivate ? selectedUsers.map((u) => u.uid) : [],
      });

      if (isPrivate && selectedUsers.length > 0) {
        await sendBackgroundEmailInvites(
          title.trim(),
          description.trim(),
          getFormattedDate(date),
          getFormattedTime(time),
          location.trim()
        );
      }

      // Reset Fields
      setTitle("");
      setDescription("");
      setLocation("");
      setDate(new Date());
      setTime(new Date());
      setIsPrivate(false);
      setSelectedUsers([]);
      setSearchQuery("");

      setIsCreatorVisible(false);

      Alert.alert(
        "Success",
        isPrivate
          ? "Personal event created & invites sent!"
          : "Neighborhood event posted."
      );
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

      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.BackButton}
              onPress={() => router.back()}
            >
              <IconSymbol name="chevron.left" size={20} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Neighborhood Events</Text>
          </View>

          <Text style={styles.sectionHeader}>Upcoming Events</Text>

          {events.map((item) => (
            <EventItem
              key={item.id}
              item={item}
              isMyEvent={item.userId === currentUserUid}
              onDelete={handleDeleteEvent}
              currentUserId={currentUserUid}
            />
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.floatingActionButton}
          onPress={() => setIsCreatorVisible(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#ffffff", "rgba(255, 255, 255, 0.75)"]}
            style={styles.fabGradientInner}
          >
            <IconSymbol name="plus" size={26} color="#0191d6" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isCreatorVisible}
        onRequestClose={() => setIsCreatorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Host an Event</Text>
              <TouchableOpacity onPress={() => setIsCreatorVisible(false)}>
                <IconSymbol name="xmark" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formCard}>
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
                  { height: 75, textAlignVertical: "top" },
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

              <View style={styles.privacyToggleRow}>
                <Text style={styles.privacyLabel}>
                  Make this a personal event
                </Text>
                <TouchableOpacity
                  style={[styles.checkbox, isPrivate && styles.checkboxChecked]}
                  onPress={() => setIsPrivate(!isPrivate)}
                >
                  {isPrivate && (
                    <Feather name="check" size={14} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              {isPrivate && (
                <View style={styles.inviteContainer}>
                  <Text style={styles.inviteLabel}>Invite Neighbors:</Text>

                  {selectedUsers.length > 0 && (
                    <View style={styles.pillContainer}>
                      {selectedUsers.map((u) => (
                        <View key={u.uid} style={styles.pill}>
                          <Text style={styles.pillText}>@{u.username}</Text>
                          <TouchableOpacity
                            onPress={() => removeUser(u.uid)}
                            style={styles.pillClose}
                          >
                            <Text style={styles.pillCloseText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <TextInput
                    placeholder="Type neighbor's username..."
                    value={searchQuery}
                    onChangeText={handleUserSearch}
                    style={styles.inviteSearchInput}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />

                  {searchResults.length > 0 && (
                    <View style={styles.dropdown}>
                      {searchResults.map((u) => (
                        <TouchableOpacity
                          key={u.uid}
                          style={styles.dropdownItem}
                          onPress={() => selectUser(u)}
                        >
                          <Text style={styles.dropdownItemText}>
                            @{u.username}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 20,
    width: "100%",
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginLeft: 55,
  },
  sectionHeader: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#f9fafb",
    height: "82%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#edeef0",
    paddingBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  formCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingBottom: 40,
  },
  singleInput: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 12,
    fontSize: 15,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  pickerSelectorButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  pickerButtonText: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "600",
  },
  privacyToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  privacyLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#9ca3af",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  checkboxChecked: {
    backgroundColor: "#0191d6",
    borderColor: "#0191d6",
  },
  inviteContainer: {
    gap: 8,
  },
  inviteLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  inviteSearchInput: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
  },
  pillText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "600",
  },
  pillClose: {
    marginLeft: 4,
    backgroundColor: "#bae6fd",
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  pillCloseText: {
    color: "#0369a1",
    fontSize: 11,
    fontWeight: "bold",
  },
  dropdown: {
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  submitButton: {
    backgroundColor: "#0191d6",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  eventCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
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
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  goingCountText: {
    fontSize: 13,
    color: "#F59E0B",
    fontWeight: "700",
  },
  BackButton: {
    position: "absolute",
    left: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  rsvpContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  rsvpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rsvpBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  rsvpGoingActive: { backgroundColor: "#10B981", borderColor: "#10B981" },
  rsvpMaybeActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  rsvpDeclinedActive: { backgroundColor: "#6B7280", borderColor: "#6B7280" },

  floatingActionButton: {
    position: "absolute",
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  fabGradientInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 30,
  },
});
