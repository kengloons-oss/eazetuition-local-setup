import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Card, Button, Menu, Divider, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import moment from "moment";
import { Dropdown } from "react-native-element-dropdown";
import { useNavigation } from "@react-navigation/native";


import { listBoxStyles } from "../styles/listBoxStyles";
import { API_BASE_URL } from "../config";
import { upsertPayment, getAllPaymentsDetailed, PaymentRecord } from "../database/localDB";
import { parentDropdownStyles } from "../styles/parentStyles";


export default function PaymentHistoryScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [menuVisible, setMenuVisible] = useState(false);


  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);

      const userData = await AsyncStorage.getItem("user");
      if (!userData) return;
      const user = JSON.parse(userData);

      const netInfo = await NetInfo.fetch();
      const isOffline = !netInfo.isConnected;

      let finalList: PaymentRecord[] = [];

      // ======================================================
      // 1️⃣ 有网 → 永远优先从 API 获取
      // ======================================================
      if (!isOffline) {
        try {
          console.log("🌐 Online → Fetching payments from server...");
          const res = await fetch(`${API_BASE_URL}/payment/all/${user.parent_id}`);

          if (!res.ok) throw new Error("Failed to fetch payments");
          const data = await res.json();

          if (Array.isArray(data)) {
            finalList = data;

            // sync 回 local DB
            console.log("💾 Syncing payments to local DB...");
            data.forEach((p: any) => upsertPayment(p));
          }
        } catch (apiErr) {
          console.warn("⚠️ API failed, fallback to local DB", apiErr);
        }
      }

      // ======================================================
      // 2️⃣ 没网 / API失败 → 使用 local DB
      // ======================================================
      if (finalList.length === 0) {
        console.log("📦 Using local DB payments...");
        finalList = await getAllPaymentsDetailed();
      }

      finalList = finalList.map((p: any) => ({
        ...p,
        payment_status: p.payment_status?.toLowerCase?.() || p.payment_status
      }));

      setPayments(finalList);
      applyFilter(statusFilter, finalList);
    } catch (err) {
      console.error("❌ Error loading payments:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };


  // ==============================================================
  // 🧩 Filter by status
  // ==============================================================
  const applyFilter = (filter: string, list?: PaymentRecord[]) => {
    const source = list || payments;
    setStatusFilter(filter);

    if (filter === "all") {
      setFilteredPayments(source);
    } else {
      setFilteredPayments(
        source.filter(
          (p) =>
            p.payment_status?.toLowerCase() === filter
        )
      );
    }
  };



  // ==============================================================
  // 🧩 Group by Month (SectionList)
  // ==============================================================
  // 🔥 分组：先按状态（pending/paid），再按日期
  const groupedPayments = () => {
    const groups: Record<
      string,
      { status: string; date: string; data: PaymentRecord[] }
    > = {};

    filteredPayments.forEach((p) => {
      // 保留原本的 payment_status（全小写）
      const raw = p.payment_status;

      // UI 显示版状态
      let status = "";
      if (raw === "pending") status = "Pending";
      else if (raw === "paid") status = "Paid";
      else if (raw === "overdue") status = "Overdue";
      else if (raw === "barred") status = "Barred";
      else status = "Unknown"; // 不要默认为 Paid！

      const dateStr = moment(p.created_at).format("DD MMM YYYY");

      const key = `${status}|${dateStr}`;

      if (!groups[key]) {
        groups[key] = { status, date: dateStr, data: [] };
      }

      groups[key].data.push(p);
    });

    const weight: Record<string, number> = {
      Pending: 1,
      Overdue: 2,
      Barred: 3,
      Paid: 4,
      Unknown: 5,
    };

    return Object.values(groups).sort((a, b) => {
      const wA = weight[a.status] ?? 999;
      const wB = weight[b.status] ?? 999;

      if (wA !== wB) return wA - wB;

      return (
        moment(b.date, "DD MMM YYYY").valueOf() -
        moment(a.date, "DD MMM YYYY").valueOf()
      );
    });
  };



  // ==============================================================
  // 🧩 UI Helpers
  // ==============================================================
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending":
        return {
          backgroundColor: "#FDECC8",
          color: "#8B6D00",
          icon: "time-outline",
          label: "Pending",
        };

      case "overdue":
        return {
          backgroundColor: "#FFE0E0",
          color: "#B01010",
          icon: "alert-circle-outline",
          label: "Overdue",
        };

      case "barred":
        return {
          backgroundColor: "#E0E0E0",
          color: "#555",
          icon: "ban-outline",
          label: "Barred",
        };

      default: // paid
        return {
          backgroundColor: "#C8F3D0",
          color: "#107C10",
          icon: "checkmark-outline",
          label: "Paid",
        };
    }
  };


  // ==============================================================
  // 🧩 Render Payment Card
  // ==============================================================
  const renderPaymentItem = ({ item }: { item: PaymentRecord }) => {
    const statusStyle = getStatusStyle(item.payment_status);
    const canPay = item.payment_status === "pending" || item.payment_status === "overdue";

    return (
      <Card style={listBoxStyles?.baseCard || styles.paymentCard} mode="elevated">
        <View style={listBoxStyles?.row || styles.cardRow}>
          <Text
            style={[listBoxStyles?.titleText || styles.paymentTitle, { maxWidth: "70%" }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>

          <View
            style={[
              listBoxStyles?.statusBadge || styles.statusBadge,
              { backgroundColor: statusStyle.backgroundColor },
            ]}
          >
            <Ionicons name={statusStyle.icon as any} size={16} color={statusStyle.color} />
            <Text style={[listBoxStyles?.statusText || styles.statusText, { color: statusStyle.color }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        <View style={[styles.cardRow, { marginTop: 8 }]}>
          <Text
            style={[styles.paymentDescription, { flex: 1, maxWidth: "70%" }]}
            numberOfLines={2}
          >
            {item.description || "No details available"}
          </Text>

          <Button
            mode="contained-tonal"
            onPress={() => {
              navigation.navigate("Payment Detail", {
                payment_id: item.payment_id,
                onPaidRefresh: () => loadPayments
              });

            }}
            style={[
              listBoxStyles?.actionButton || styles.paymentButton,
              { backgroundColor: canPay ? "#0078D4" : "#E1DFDD" },
            ]}
            labelStyle={{
              color: canPay ? "#fff" : "#323130",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            {canPay ? "Make Payment" : "View Details"}
          </Button>


        </View>
      </Card>
    );
  };


  // ==============================================================
  // 🧩 Render
  // ==============================================================
  return (
    <View style={[styles.container, { backgroundColor: "#f9f9f9" }]}>
      {/* 筛选菜单 */}
      <View style={{ paddingHorizontal: 0, marginBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>
          Filter by Status
        </Text>

        <Dropdown
          style={[parentDropdownStyles.dropdown]}
          placeholderStyle={parentDropdownStyles.placeholder}
          selectedTextStyle={parentDropdownStyles.selectedText}
          iconStyle={parentDropdownStyles.icon}
          containerStyle={parentDropdownStyles.container}
          itemTextStyle={parentDropdownStyles.itemText}

          data={[
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Paid", value: "paid" },
            { label: "Overdue", value: "overdue" },
            { label: "Barred", value: "barred" },
          ]}

          labelField="label"
          valueField="value"

          placeholder="Select Status"
          value={statusFilter}
          onChange={(item) => applyFilter(item.value)}
        />
      </View>


      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : payments.length === 0 || filteredPayments.length === 0 ? (
        <Card style={[styles.paymentCard, styles.emptyCard]} mode="elevated">
          <View style={styles.emptyStateContainer}>
            <Ionicons name="wallet-outline" size={42} color="#0078D4" />
            <Text style={styles.emptyStateTitle}>No Payments Found</Text>
            <Text style={styles.emptyStateSubtitle}>
              You&apos;re all caught up! 🎉
            </Text>
          </View>
        </Card>
      ) : (
        <SectionList
          sections={groupedPayments()}
          keyExtractor={(item) => item.payment_id?.toString() || Math.random().toString()}
          renderItem={renderPaymentItem}
          renderSectionHeader={({ section }) => {
            const headerColors: any = {
              "Pending": { bg: "#FFF4D3", color: "#8B6D00" },
              "Overdue": { bg: "#FFE5E5", color: "#B01010" },
              "Barred": { bg: "#E8E8E8", color: "#555" },
              "Paid": { bg: "#DFF5E3", color: "#107C10" },
            };

            const style = headerColors[section.status];

            return (
              <View
                style={[
                  styles.sectionHeaderContainer,
                  { backgroundColor: style.bg }
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: style.color }
                  ]}
                >
                  {section.date}
                </Text>
              </View>
            );
          }}
          refreshing={loading}
          onRefresh={loadPayments}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={{ paddingBottom: 50 }}
        />

      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 25,
    paddingHorizontal: 20,
  },
  filterRow: {
    alignItems: "flex-end",
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 8,
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

  sectionHeaderContainer: {
    backgroundColor: "#F4F4F4",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 10,
  },
});
