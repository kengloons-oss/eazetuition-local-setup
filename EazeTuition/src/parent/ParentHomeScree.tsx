// ParentHomeScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import {
  Card,
  Button,
  useTheme,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { listBoxStyles } from "../styles/listBoxStyles";
import { API_BASE_URL } from "../config";

import {
  getAllPayments,
  PaymentRecord,
} from "../database/localDB";

export default function ParentHomeScreen({ navigation }: any) {
  const theme = useTheme();
  const [user, setUser] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user + payments on mount
  useEffect(() => {
    const loadUserAndPayments = async () => {
      try {
        const data = await AsyncStorage.getItem("user");
        if (data) {
          const parsedUser = JSON.parse(data);
          setUser(parsedUser);
          fetchPendingPayments(parsedUser.parent_id);
        }
      } catch (err) {
        console.error("❌ Failed to load user:", err);
        setLoading(false);
      }
    };
    loadUserAndPayments();
  }, []);

  // Fetch payments
  const fetchPendingPayments = async (parent_id: number) => {
    try {
      const netInfo = await NetInfo.fetch();
      const isOffline = !netInfo.isConnected;

      if (isOffline) {
        const localPayments = await getPendingPaymentsFromLocal();
        setPayments(localPayments);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/payment/pending-payment/${parent_id}`
      );

      if (!response.ok) throw new Error("Failed to fetch payments");

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setPayments(data);
      } else {
        const localPayments = await getPendingPaymentsFromLocal();
        setPayments(localPayments);
      }
    } catch (err) {
      console.error("❌ Error fetching payments:", err);

      const localPayments = await getPendingPaymentsFromLocal();
      setPayments(localPayments);
    } finally {
      setLoading(false);
    }
  };

  const getPendingPaymentsFromLocal = async (): Promise<PaymentRecord[]> => {
    try {
      const allPayments = getAllPayments();
      const pendingPayments = allPayments.filter(
        (p) =>
          p.payment_status === "pending" ||
          p.payment_status === "overdue"
      );

      return pendingPayments;
    } catch (error) {
      console.error("❌ Failed to load pending payments:", error);
      return [];
    }
  };

  // Greeting
  const today = moment().format("ddd - DD/MM/YYYY").toUpperCase();
  const userName = user?.name || "User";

  const getStatusStyle = (status: string) => {
    if (status === "pending") {
      return {
        backgroundColor: "#FDECC8",
        color: "#8B6D00",
        icon: "time-outline",
        label: "Pending",
      };
    }

    if (status === "overdue") {
      return {
        backgroundColor: "#FFE0E0",
        color: "#B01010",
        icon: "alert-circle-outline",
        label: "Overdue",
      };
    }

    // ❌ 所有 paid & barred 不显示 badge（return null）
    return null;
  };



  const actions = [
    { icon: "card-outline", label: "Payment", route: "PaymentHistory" },
    // { icon: "calendar-outline", label: "Attendance", route: "ManageChildScreen" },
    { icon: "people-outline", label: "Child", route: "ManageChildScreen" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: "#f9f9f9" }]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => {
            if (user) {
              console.log("🔄 Entire page pull-to-refresh triggered");
              setLoading(true);
              fetchPendingPayments(user.parent_id);
            }
          }}
          tintColor="#0078D4"   // iOS spinner
          colors={["#0078D4"]}  // Android spinner
        />
      }
    >
      {/* 1️⃣ 日期 */}
      <Text style={styles.dateText}>{today}</Text>

      {/* 2️⃣ Greeting */}
      <Text style={styles.greetingText}>Hi, {userName} 👋</Text>

      {/* 3️⃣ Quick Actions */}
      <View style={styles.actionRow}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={action.label}
            style={[
              styles.actionButtonWrapper,
              index === 0 && { marginLeft: 0 },
              index === actions.length - 1 && { marginRight: 0 },
            ]}
            onPress={() => navigation.navigate(action.route)}
            activeOpacity={0.9}
          >
            <View style={styles.actionButton}>
              <Ionicons
                name={action.icon as any}
                size={26}
                color="#0078D4"
              />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.dashedDivider} />

      {/* Pending Payment Header */}
      <Text style={styles.sectionHeader}>Pending Payment</Text>

      {/* Payment Cards */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0078D4"
          style={{ marginTop: 40 }}
        />
      ) : payments.length === 0 ? (
        <Card style={[styles.paymentCard, styles.emptyCard]} mode="elevated">
          <View style={styles.emptyStateContainer}>
            <Ionicons name="checkmark-done-outline" size={42} color="#0078D4" />
            <Text style={styles.emptyStateTitle}>No Pending Payment Found</Text>
            <Text style={styles.emptyStateSubtitle}>
              You&apos;re all caught up! 🎉
            </Text>
          </View>
        </Card>
      ) : (
        payments.map((item) => {
          const statusStyle = getStatusStyle(item.payment_status);
          const canPay = item.payment_status === "pending" || item.payment_status === "overdue";

          return (
            <Card
              key={item.payment_id}
              style={listBoxStyles?.baseCard || styles.paymentCard}
              mode="elevated"
            >
              <View style={listBoxStyles?.row || styles.cardRow}>
                <Text
                  style={[listBoxStyles?.titleText || styles.paymentTitle, { maxWidth: "70%" }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>

                {statusStyle && (
                  <View
                    style={[
                      listBoxStyles?.statusBadge || styles.statusBadge,
                      { backgroundColor: statusStyle.backgroundColor },
                    ]}
                  >
                    <Ionicons
                      name={statusStyle.icon as any}
                      size={16}
                      color={statusStyle.color}
                    />
                    <Text
                      style={[
                        listBoxStyles?.statusText || styles.statusText,
                        { color: statusStyle.color },
                      ]}
                    >
                      {statusStyle.label}
                    </Text>
                  </View>
                )}

              </View>

              <View style={[styles.cardRow, { marginTop: 8 }]}>
                <Text
                  style={[styles.paymentDescription, { flex: 1, maxWidth: "70%" }]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>

                <Button
                  mode="contained-tonal"
                  onPress={() => {
                    navigation.navigate("Payment Detail", {
                      payment_id: item.payment_id,
                      onPaidRefresh: fetchPendingPayments(user.parent_id)
                    });
                  }}
                  style={[
                    listBoxStyles?.actionButton || styles.paymentButton,
                    {
                      backgroundColor: canPay ? "#0078D4" : "#E1DFDD",
                    },
                  ]}
                  labelStyle={{
                    color: canPay ? "#fff" : "#323130",
                    fontWeight: "bold",
                    fontSize: 14,
                  }}
                >
                  {item.payment_status === "pending" ? "Make Payment" : "View Details"}
                </Button>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

// ✅ 样式定义
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 25,
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 18,
  },

  // ✅ 改进的操作区布局
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  actionButtonWrapper: {
    flex: 1,
    marginHorizontal: 6, // 🔹 按钮之间的间距
  },
  actionButton: {
    backgroundColor: "#E5F1FB",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 6,
  },

  dashedDivider: {
    borderBottomColor: "#444",
    borderBottomWidth: 2.5,
    borderStyle: "dashed",
    marginVertical: 18,
    opacity: 0.80,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 12,
  },
  paymentCard: {
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 6,
  },
  paymentDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
  },
  paymentButton: {
    alignSelf: "center",
    borderRadius: 8,
    height: 36,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: "500",
  },

  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  emptyCard: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },

});
