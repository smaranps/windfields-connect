import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { AppIcon } from "@/app/components/icon";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";

interface ChatRoom {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  lastMessage: string;
  lastMessageAt: any;
  lastSenderId?: string;
}

export default function InboxScreen() {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, orderBy("lastMessageAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activeChats: ChatRoom[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (
            data.buyerId === currentUserId ||
            data.sellerId === currentUserId
          ) {
            activeChats.push({
              id: doc.id,
              ...data,
            } as ChatRoom);
          }
        });
        setChats(activeChats);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching inbox: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const renderChatItem = ({ item }: { item: ChatRoom }) => {
    const isSellerObj = item.sellerId === currentUserId;
    const chatPartnerName = isSellerObj ? item.buyerName : item.sellerName;
    const roleBadge = isSellerObj ? "Selling" : "Buying";

    let isUnread = false;
    if (item.lastSenderId) {
      isUnread = item.lastSenderId !== currentUserId;
    } else if (item.lastMessage) {
      if (isSellerObj) {
        isUnread = true;
      } else {
        isUnread = !item.lastMessage.startsWith("Is this still available");
      }
    }

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={async () => {
          try {
            const chatDocRef = doc(db, "chats", item.id);
            await updateDoc(chatDocRef, {
              lastSenderId: currentUserId,
            });
          } catch (error) {
            console.log("Could not clear badge:", error);
          }

          router.push({
            pathname: "/messages",
            params: {
              chatId: item.id,
              listingId: item.listingId,
              listingTitle: item.listingTitle,
              sellerId: item.sellerId,
              sellerName: item.sellerName,
              buyerId: item.buyerId,
              buyerName: item.buyerName,
            },
          });
        }}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {chatPartnerName.charAt(0).toUpperCase()}
            </Text>
          </View>

          {isUnread && <View style={styles.avatarRedDot} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <Text style={[styles.partnerName, isUnread && styles.unreadText]}>
              {chatPartnerName}
            </Text>
            <View
              style={[
                styles.badge,
                isSellerObj ? styles.sellingBadge : styles.buyingBadge,
              ]}
            >
              <Text style={styles.badgeText}>{roleBadge}</Text>
            </View>
          </View>

          <Text
            style={[styles.itemTitle, isUnread && styles.unreadText]}
            numberOfLines={1}
          >
            {item.listingTitle}
          </Text>
          <Text
            style={[styles.lastMessage, isUnread && styles.unreadLastMessage]}
            numberOfLines={1}
          >
            {item.lastMessage || "No messages yet..."}
          </Text>
        </View>

        <AppIcon
          sfName="chevron.right"
          lucideName="ChevronRight"
          size={16}
          color="#9ca3af"
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <AppIcon
            sfName="chevron.left"
            lucideName="ChevronLeft"
            size={24}
            color="#111827"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Messages</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0191d6" />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppIcon
            sfName="bubble.left.and.bubble.right.fill"
            lucideName="MessageSquare"
            size={60}
            color="#cbd5e1"
          />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            When you message a seller or someone messages you, your chats will
            appear here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  chatCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0369a1",
  },
  chatInfo: {
    flex: 1,
    marginRight: 8,
  },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 13,
    color: "#94a3b8",
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  sellingBadge: {
    backgroundColor: "#fef3c7",
  },
  buyingBadge: {
    backgroundColor: "#dcfce7",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#475569",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatarRedDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ef4444",
    borderWidth: 2,
    borderColor: "white",
  },
  unreadText: {
    fontWeight: "800",
    color: "#0f172a",
  },
  unreadLastMessage: {
    color: "#1e293b",
    fontWeight: "600",
  },
});
