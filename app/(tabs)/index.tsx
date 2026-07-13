import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
const { width } = Dimensions.get("window");

const CAROUSEL_SLIDES = [
  {
    id: "1",
    iconFamily: "Feather",
    iconName: "activity",
    iconColor: "#34C759",
    title: "Network Status",
    metric: "Live & Growing",
    desc: "Create an account to join your neighbors and receive live updates.",
  },
  {
    id: "2",
    iconFamily: "Feather",
    iconName: "map-pin",
    iconColor: "#FF9500",
    title: "Community Map",
    metric: "Active Grid",
    desc: "Drop real time markers for local safety alerts, lost items, and street updates.",
  },
  {
    id: "3",
    iconFamily: "Ionicons",
    iconName: "people-outline",
    iconColor: "#007AFF",
    title: "Local Meetups",
    metric: "Verified Profiles",
    desc: "Coordinate block events safely with real residents.",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -15,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);

        slideAnim.setValue(15);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [fadeAnim, slideAnim]);

  const renderIcon = (slide: (typeof CAROUSEL_SLIDES)[0]) => {
    if (slide.iconFamily === "Ionicons") {
      return (
        <Ionicons
          name={slide.iconName as any}
          size={32}
          color={slide.iconColor}
        />
      );
    }
    return (
      <Feather name={slide.iconName as any} size={30} color={slide.iconColor} />
    );
  };

  return (
    <LinearGradient
      colors={["#0191d6", "#06c9c1"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 0 }}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Windfields Connect</Text>
            <Text style={styles.subtitle}>The Local Neighborhood Hub.</Text>
          </View>

          <View style={styles.carouselContainer}>
            <Text style={styles.pulseLabel}>LIVE NEIGHBORHOOD PULSE</Text>

            <View style={styles.glassCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrapper}>
                  {renderIcon(CAROUSEL_SLIDES[currentSlide])}
                </View>
                <View>
                  <Text style={styles.cardTitle}>
                    {CAROUSEL_SLIDES[currentSlide].title}
                  </Text>
                  <Text style={styles.cardMetric}>
                    {CAROUSEL_SLIDES[currentSlide].metric}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>
                {CAROUSEL_SLIDES[currentSlide].desc}
              </Text>
            </View>

            <View style={styles.indicatorContainer}>
              {CAROUSEL_SLIDES.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    currentSlide === index
                      ? styles.activeIndicator
                      : styles.inactiveIndicator,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => router.push("/signup")}
              style={styles.primaryButton}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/login")}
              style={styles.secondaryButton}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>
                I already have an account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 15,
  },
  carouselContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 20,
  },
  pulseLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 2,
    marginBottom: 12,
  },
  glassCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardMetric: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  indicatorContainer: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
  },
  activeIndicator: {
    width: 24,
    backgroundColor: "#ffffff",
  },
  inactiveIndicator: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
    paddingBottom: 30,
  },
  primaryButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#0191d6",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.6)",
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
