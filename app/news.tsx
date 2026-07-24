import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Stack } from "expo-router";

interface NewsArticle {
  article_id: string;
  title: string;
  description?: string;
  link?: string;
  image_url?: string;
  source_id?: string;
  pubDate?: string;
}

const API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY;

export default function GlassNewsScreen() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async () => {
    try {
      const query = encodeURIComponent(
        'Oshawa OR Windfields OR "Ontario Tech"'
      );
      const response = await fetch(
        `https://newsdata.io/api/1/latest?apikey=${API_KEY}&q=${query}&country=ca`
      );
      const data = await response.json();

      if (data.results) {
        setArticles(data.results);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const renderGlassCard = ({ item }: { item: NewsArticle }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => item.link && Linking.openURL(item.link)}
      style={styles.cardWrapper}
    >
      <BlurView intensity={25} tint="light" style={styles.glassCard}>
        <View style={styles.glassContent}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <IconSymbol name="newspaper" size={24} color="#FFFFFF" />
            </View>
          )}

          <View style={styles.textContent}>
            <View style={styles.glassTag}>
              <Text style={styles.glassTagText}>
                {item.source_id ? item.source_id.toUpperCase() : "LOCAL NEWS"}
              </Text>
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description || "Tap to view full story..."}
            </Text>

            <Text style={styles.cardDate}>
              {item.pubDate
                ? new Date(item.pubDate).toLocaleDateString()
                : "Today"}
            </Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={["#0191d6", "#06c9c1"]}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Stack.Screen options={{ headerShown: false }} />
        

        <BlurView intensity={35} tint="light" style={styles.headerGlass}>
          <Text style={styles.headerTitle}>Local News & Updates</Text>
          <Text style={styles.headerSubtitle}>Windfields & Oshawa</Text>
        </BlurView>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#E0F2F1" />
            <Text style={styles.loadingText}>Loading glass feed...</Text>
          </View>
        ) : (
          <FlatList
            data={articles}
            keyExtractor={(item) => item.article_id}
            renderItem={renderGlassCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFFFFF"
              />
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerGlass: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  cardWrapper: {
    marginBottom: 14,
    borderRadius: 20,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  glassCard: {
    borderRadius: 20,
    padding: 12,

    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    overflow: "hidden",
  },
  glassContent: {
    flexDirection: "row",
  },
  cardImage: {
    width: 85,
    height: 85,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  placeholderImage: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  textContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  glassTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    marginBottom: 4,
  },
  glassTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 18,
  },
  cardDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 3,
  },
  cardDate: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 6,
    fontWeight: "600",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 13,
  },
});
