import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar } from "react-native-calendars";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { db } from "../services/firebaseConfig";
import { collection, query, onSnapshot } from "firebase/firestore";
import { Stack, router } from "expo-router";

export default function CalendarViewScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const q = query(collection(db, "events"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(fetchedEvents);
      const marks: { [key: string]: any } = {};
      fetchedEvents.forEach((event: any) => {
        if (event.rawDateString) {
          marks[event.rawDateString] = { marked: true, dotColor: "#0191d6" };
        }
      });
      setMarkedDates(marks);
    });

    return () => unsubscribe();
  }, []);
  const filteredEvents = events.filter(
    (event) => event.rawDateString === selectedDate
  );
  const getCombinedMarkedDates = () => {
    return {
      ...markedDates,
      [selectedDate]: {
        ...markedDates[selectedDate],
        selected: true,
        selectedColor: "#06c9c1",
      },
    };
  };

  return (
    <LinearGradient colors={["#0191d6", "#06c9c1"]} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.BackButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Community Calendar</Text>

        <View style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={getCombinedMarkedDates()}
            theme={{
              backgroundColor: "#ffffff",
              calendarBackground: "#ffffff",
              textSectionTitleColor: "#b6c1cd",
              selectedDayBackgroundColor: "#06c9c1",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#0191d6",
              dayTextColor: "#2d4150",
              textDisabledColor: "#d9e1e8",
              dotColor: "#0191d6",
              arrowColor: "#0191d6",
              monthTextColor: "#0191d6",
              indicatorColor: "blue",
              textDayFontWeight: "600",
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "500",
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
            style={{ borderRadius: 15 }}
          />
        </View>
        <Text style={styles.sectionHeader}>Schedule for {selectedDate}</Text>

        {filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No events planned for this day. Quiet neighborhood!
            </Text>
          </View>
        ) : (
          filteredEvents.map((item) => (
            <View key={item.id} style={styles.eventCard}>
              <Text style={styles.eventTitleText}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.descriptionText}>{item.description}</Text>
              ) : null}

              <View style={styles.infoBadge}>
                <IconSymbol name="clock" size={14} color="#0191d6" />
                <Text style={styles.badgeText}>{item.time}</Text>
              </View>
              <View style={[styles.infoBadge, { marginTop: 6 }]}>
                <IconSymbol
                  name="mappin.and.ellipse"
                  size={14}
                  color="#06c9c1"
                />
                <Text style={styles.badgeText}>{item.location}</Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 80 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginTop: 30,
    marginBottom: 50,
  },
  calendarCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionHeader: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 15,
  },
  emptyState: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
  },
  emptyStateText: {
    color: "white",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  eventCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
  },
  eventTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  descriptionText: { fontSize: 14, color: "#4B5563", marginBottom: 10 },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 6,
    borderRadius: 6,
    gap: 6,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  BackButton: {
    position: "absolute",
    top: -20,
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
