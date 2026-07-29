import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { AppIcon } from "@/app/components/icon";
import { db, auth } from "../services/firebaseConfig";
import { generateSmartReplies } from "../services/geminiConfig";
import {
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  orderBy,
  query,
  where,
  getDoc,
} from "firebase/firestore";

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
  read?: boolean;
}

export default function ChatScreen() {
  const { chatRoomId, otherUserId } = useLocalSearchParams<{
    chatRoomId: string;
    otherUserId: string;
  }>();
  const router = useRouter();
  const params = useLocalSearchParams();
  const ICEBREAKERS = [
    "Is this still available? ",
    "Is the price negotiable?",
    "When and where can I pick this up?",
  ];

  const {
    chatId,
    listingId,
    listingTitle,
    sellerId,
    sellerName,
    buyerId,
    buyerName,
  } = params;

  const currentUserId = auth.currentUser?.uid;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const [isSold, setIsSold] = useState(false);
  const activeChatId = (chatId as string) || `${listingId}_${buyerId}`;

  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [aiRepliesLoading, setAiRepliesLoading] = useState(false);

  const renderMessageStatus = (message: Message) => {
    if (message.senderId !== currentUserId) return null;

    if (message.read) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.seenText}>Seen</Text>
        </View>
      );
    } else {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.sentText}>Sent</Text>
        </View>
      );
    }
  };

  const handleSendIcebreaker = async (text: string) => {
    if (!currentUserId) return;

    try {
      const chatDocRef = doc(db, "chats", activeChatId);
      const messagesRef = collection(db, "chats", activeChatId, "messages");

      await setDoc(
        chatDocRef,
        {
          listingId,
          listingTitle,
          sellerId,
          sellerName,
          buyerId,
          buyerName,
          lastMessage: text,
          lastMessageAt: serverTimestamp(),
          lastSenderId: currentUserId,
        },
        { merge: true }
      );

      await addDoc(messagesRef, {
        senderId: currentUserId,
        text: text,
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (error) {
      console.error("Error sending icebreaker: ", error);
    }
  };

  useEffect(() => {
    if (!listingId) return;

    const fetchListingStatus = async () => {
      try {
        const listingDocRef = doc(db, "listings", listingId as string);
        const snapshot = await onSnapshot(listingDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsSold(data.status === "sold" || data.isAvailable === false);
          }
        });
        return () => snapshot();
      } catch (error) {
        console.log("Error checking listing status:", error);
      }
    };

    fetchListingStatus();
  }, [listingId]);

  useEffect(() => {
    if (!activeChatId || !currentUserId) return;

    const presenceRef = doc(
      db,
      "chats",
      activeChatId,
      "presence",
      currentUserId
    );
    setDoc(presenceRef, {
      active: true,
      lastSeen: serverTimestamp(),
    });

    return () => {
      setDoc(presenceRef, {
        active: false,
        lastSeen: serverTimestamp(),
      });
    };
  }, [activeChatId, currentUserId]);

  useEffect(() => {
    if (!activeChatId || !currentUserId) return;

    const messagesRef = collection(db, "chats", activeChatId, "messages");

    const q = query(
      messagesRef,
      where("senderId", "!=", currentUserId),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(async (docSnap) => {
        const messageDocRef = doc(
          db,
          "chats",
          activeChatId,
          "messages",
          docSnap.id
        );
        try {
          await updateDoc(messageDocRef, { read: true });
        } catch (err) {
          console.error("Error updating read status:", err);
        }
      });
    });

    return () => unsubscribe();
  }, [activeChatId, currentUserId]);

  const handleMarkAsSold = async () => {
    if (!listingId) return;

    try {
      const listingDocRef = doc(db, "listings", listingId as string);

      await updateDoc(listingDocRef, {
        status: "sold",
        isAvailable: false,
      });

      setIsSold(true);
      console.log("Listing marked as SOLD!");
    } catch (error) {
      console.error("Error updating listing status: ", error);
    }
  };

  useEffect(() => {
    if (!activeChatId) return;

    const messagesRef = collection(db, "chats", activeChatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedMessages.push({
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          createdAt: data.createdAt,
          read: data.read ?? false,
        });
      });

      setMessages(loadedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const lastProcessedMessageId = useRef<string>("");

  useEffect(() => {
    if (messages.length === 0) {
      setAiReplies([]);
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage.senderId === currentUserId ||
      lastProcessedMessageId.current === lastMessage.id
    ) {
      return;
    }

    const fetchSmartSuggestions = async () => {
      setAiRepliesLoading(true);
      lastProcessedMessageId.current = lastMessage.id;

      try {
        const historyData = messages.slice(-4).map((m) => ({
          senderId: m.senderId === currentUserId ? "me" : "buyer",
          text: m.text,
        }));
        const suggestionResult = await generateSmartReplies(historyData);
        setAiReplies(suggestionResult.replies);
      } catch (err) {
        console.log("Failed fetching chips:", err);
      } finally {
        setAiRepliesLoading(false);
      }
    };

    const delayTimer = setTimeout(() => {
      fetchSmartSuggestions();
    }, 1000);

    return () => clearTimeout(delayTimer);
  }, [messages, currentUserId]);

  useEffect(() => {
    const rawId = chatId || activeChatId;
    const idToUse = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    if (!idToUse || !currentUserId) return;

    const clearUnreadStatus = async () => {
      try {
        const chatDocRef = doc(db, "chats", idToUse);

        await updateDoc(chatDocRef, {
          lastSenderId: currentUserId,
        });

        console.log("Cleared badge successfully!");
      } catch (error) {
        console.log(
          "Note: Could not update lastSenderId (might be a brand new chat)",
          error
        );
      }
    };

    const timer = setTimeout(() => {
      clearUnreadStatus();
    }, 100);

    return () => clearTimeout(timer);
  }, [chatId, activeChatId, currentUserId]);

  const handleSendMessage = async () => {
    const activeChatIdToUse = Array.isArray(activeChatId)
      ? activeChatId[0]
      : activeChatId;

    const rawRecipientId =
      (otherUserId as string) ||
      (currentUserId === sellerId ? buyerId : sellerId);
    const recipientId = Array.isArray(rawRecipientId)
      ? rawRecipientId[0]
      : rawRecipientId;

    if (
      !inputText.trim() ||
      !currentUserId ||
      !activeChatIdToUse ||
      !recipientId
    )
      return;

    try {
      const otherPresenceRef = doc(
        db,
        "chats",
        activeChatIdToUse,
        "presence",
        recipientId
      );
      const presenceSnap = await getDoc(otherPresenceRef);
      const isOtherUserActive = presenceSnap.exists()
        ? presenceSnap.data().active === true
        : false;

      const messagesRef = collection(
        db,
        "chats",
        activeChatIdToUse,
        "messages"
      );
      await addDoc(messagesRef, {
        text: inputText.trim(),
        senderId: currentUserId,
        createdAt: serverTimestamp(),
        read: isOtherUserActive,
      });

      setInputText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUserId;
    return (
      <View style={[styles.messageRow, isMe ? styles.myRow : styles.theirRow]}>
        <View
          style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}
        >
          <Text
            style={[
              styles.messageText,
              isMe ? styles.myText : styles.theirText,
            ]}
          >
            {item.text}
          </Text>
        </View>
        {isMe && renderMessageStatus(item)}
      </View>
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

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerName}>
            {currentUserId === sellerId ? buyerName : sellerName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Regarding: {listingTitle}
          </Text>
        </View>
      </View>

      {isSold ? (
        <View style={[styles.sellerBanner, styles.bannerSold]}>
          <Text style={styles.bannerText}>
            {currentUserId === sellerId
              ? " You marked this item as Sold."
              : "This item has been sold by the seller."}
          </Text>
        </View>
      ) : (
        currentUserId === sellerId && (
          <View style={[styles.sellerBanner, styles.bannerActive]}>
            <Text style={styles.bannerText}>
              Keep track of your deal. Once completed:
            </Text>
            <TouchableOpacity
              style={styles.soldButton}
              onPress={handleMarkAsSold}
            >
              <Text style={styles.soldButtonText}>Mark as Sold</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0191d6" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      {!loading && aiReplies.length > 0 && (
        <View style={styles.smartReplyOuterContainer}>
          <View style={styles.aiLabelContainer}>
            <AppIcon
              sfName="sparkles"
              lucideName="Sparkles"
              size={12}
              color="#0191d6"
            />
            <Text style={styles.smartReplyLabel}>Gemini Smart Replies</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.smartReplyScrollWrapper}
          >
            {aiReplies.map((replyStr, rIndex) => (
              <TouchableOpacity
                key={rIndex}
                style={styles.smartReplyChip}
                onPress={() => setInputText(replyStr)}
              >
                <Text style={styles.smartReplyChipText}>{replyStr}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!loading && messages.length === 0 && currentUserId === buyerId && (
        <View style={styles.icebreakerContainer}>
          <Text style={styles.icebreakerTitle}>
            Tap to send a quick message:
          </Text>
          <View style={styles.icebreakerList}>
            {ICEBREAKERS.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.icebreakerPill}
                onPress={() => handleSendIcebreaker(item)}
              >
                <Text style={styles.icebreakerText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={inputText}
              onChangeText={setInputText}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
            >
              <AppIcon
                sfName="paperplane.fill"
                lucideName="Send"
                size={18}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.6)",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: "column",
    width: "100%",
    marginVertical: 4,
  },
  myRow: {
    alignItems: "flex-end",
  },
  theirRow: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: "#0191d6",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: "white",
  },
  theirText: {
    color: "#374151",
  },

  smartReplyOuterContainer: {
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "rgba(240, 244, 248, 0.7)",
  },
  aiLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  smartReplyLabel: {
    fontSize: 11,
    color: "#0191d6",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  smartReplyScrollWrapper: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  smartReplyChip: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(1, 145, 214, 0.2)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#0191d6",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  smartReplyChipText: {
    fontSize: 13,
    color: "#1f2937",
    fontWeight: "500",
  },
  inputWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "white",
    borderRadius: 28,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.5)",
  },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: "#1f2937",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#0191d6",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  icebreakerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  icebreakerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  icebreakerList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  icebreakerPill: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  icebreakerText: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  sellerBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  bannerActive: {
    backgroundColor: "#eff6ff",
  },
  bannerSold: {
    backgroundColor: "#f0fdf4",
  },
  bannerText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    flex: 1,
    marginRight: 8,
  },
  soldButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  soldButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  statusContainer: {
    alignSelf: "flex-end",
    marginTop: 2,
    marginRight: 4,
  },
  seenText: {
    fontSize: 10,
    color: "#0191d6",
    fontWeight: "600",
  },
  sentText: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "400",
  },
});
