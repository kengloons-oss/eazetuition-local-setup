import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useStripe } from "@stripe/stripe-react-native";
import {
    Card,
    Text,
    Divider,
    RadioButton,
    Button,
    ActivityIndicator,
} from "react-native-paper";
import moment from "moment";
import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
    getAllPaymentsDetailed,
    getPaymentDetails,
    upsertPayment,
} from "../database/localDB";
import { API_BASE_URL } from "../config";
import BottomBar from "../components/BottomBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SweetAlertModal, { AlertConfig } from "../components/SweetAlertModel";
import LoadingOverlay from "../components/LoadingOverlay";


export default function MakePaymentScreen() {
    const route = useRoute();
    const stripe = useStripe();
    const { payment_id, onPaidRefresh } = route.params as {
        payment_id: number;
        onPaidRefresh?: () => void;
    };

    const [payment, setPayment] = useState<any>(null);
    const [details, setDetails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [method, setMethod] = useState<string>("");
    const [online, setOnline] = useState(true);
    const [alertConfig, setAlertConfig] = useState<AlertConfig>({
        visible: false,
        type: "success",
        title: "",
        message: "",
    });


    useEffect(() => {
        const unsub = NetInfo.addEventListener((state) => {
            setOnline(state.isConnected ?? false);
        });
        return () => unsub();
    }, []);


    useEffect(() => {
        loadPayment();
    }, []);

    const loadPayment = async () => {
        try {
            setLoading(true);

            // 1️⃣ Local DB
            const local = await getAllPaymentsDetailed();
            const found = local.find((p) => p.payment_id === payment_id);

            if (found) {
                setPayment(found);

                const d = await getPaymentDetails(payment_id);
                setDetails(d);

                setLoading(false);
                return;
            }

            // 2️⃣ Backend
            const res = await fetch(`${API_BASE_URL}/payment/mobile/detail/${payment_id}`);
            const data = await res.json();
            if (data?.payment_id) {
                setPayment(data);
                setDetails(data.details || []);
            }
        } catch (err) {
            console.error("❌ Failed to load payment:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading)
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 10 }}>Loading...</Text>
            </View>
        );

    if (!payment)
        return (
            <View style={styles.center}>
                <Text>Payment not found.</Text>
            </View>
        );

    const createdDate = moment(payment.created_at).format("DD MMM YYYY • hh:mm A");

    const subtotal = Number(payment.final_amt || 0) + Number(payment.discount_amt || 0);
    const safe = (val: any) => Number(val || 0).toFixed(2);
    const isPaid = payment.payment_status === "paid";


    const startStripeFlow = async () => {
        setProcessingPayment(true);       // ⬅️ 先阻止连点
        await new Promise(r => setTimeout(r, 80));  // ⬅️ 让 UI 先渲染 overlay
        await handleStripePayment();     // ⬅️ now run heavy Stripe stuff
    };

    const initializePaymentSheet = async () => {
        const res = await fetch(`${API_BASE_URL}/payment/stripe/create-sheet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payment_id }),
        });

        const data = await res.json();

        if (data.error) {
            alert(data.error);
            return false;
        }

        const { error } = await stripe.initPaymentSheet({
            merchantDisplayName: "EazeTuition",
            customerId: data.customer,
            customerEphemeralKeySecret: data.ephemeralKey,
            paymentIntentClientSecret: data.paymentIntent,
            allowsDelayedPaymentMethods: true,
        });

        if (error) {
            alert(error.message);
            return false;
        }

        return true;
    };

    const handleStripePayment = async () => {
        try {
            // 🔥 让 UI 有机会渲染 overlay（关键！）
            await new Promise(resolve => setTimeout(resolve, 80));

            const ready = await initializePaymentSheet();
            if (!ready) {
                setProcessingPayment(false);
                return;
            }

            const { error } = await stripe.presentPaymentSheet();

            if (error) {
                setProcessingPayment(false);
                alert(`Payment failed: ${error.message}`);
                return;
            }

            alert("Payment successful!");

            // Sync data after success
            const userData = await AsyncStorage.getItem("user");
            const user = JSON.parse(userData || "{}");
            const parentId = user.parent_id;

            const resList = await fetch(`${API_BASE_URL}/payment/all/${parentId}`);
            const backendPayments = await resList.json();

            const updatedPayment = backendPayments.find(
                (p: any) => p.id === payment_id
            );

            if (updatedPayment) {
                await upsertPayment(updatedPayment);
            }

            const resDetail = await fetch(`${API_BASE_URL}/payment/mobile/detail/${payment_id}`);
            const latest = await resDetail.json();

            if (latest?.payment_id) {
                setPayment(latest);
                setDetails(latest.details || []);

                if (typeof onPaidRefresh === "function") {
                    onPaidRefresh();
                }
            }

        } catch (err) {
            console.error("❌ Payment error:", err);
            alert("Payment error. Please try again.");
        } finally {
            setProcessingPayment(false);
        }
    };


    const downloadReceipt = async () => {
        if (!online) {
            return setAlertConfig({
                visible: true,
                type: "error",
                title: "Offline",
                message: "You need an internet connection to download the receipt.",
            });
        }

        try {
            setDownloading(true);

            const url = `${API_BASE_URL}/payment/${payment_id}/receipt`;
            const fileName = FileSystem.documentDirectory + `receipt_${payment_id}.pdf`;
            const res = await FileSystem.downloadAsync(url, fileName);
            // sanity check: ensure it's a real PDF
            const info = await FileSystem.getInfoAsync(res.uri);

            if (!info.exists) {
                throw new Error("PDF file missing after download.");
            }

            setAlertConfig({
                visible: true,
                type: "success",
                title: "Receipt Ready",
                message: "Your receipt is ready to be shared.",
                onConfirm: async () => {
                    setDownloading(false);
                    setAlertConfig((prev) => ({ ...prev, visible: false }));

                    const canShare = await Sharing.isAvailableAsync();
                    if (!canShare) {
                        console.log("⚠ Sharing not available.");
                        return alert("Sharing is not supported on this device.");
                    }

                    // Open share dialog
                    await Sharing.shareAsync(res.uri, {
                        mimeType: "application/pdf",
                        dialogTitle: "Share Receipt",
                    });
                },
            });

        } catch (err: any) {
            console.error("❌ PDF download failed:", err);

            setDownloading(false);

            setAlertConfig({
                visible: true,
                type: "error",
                title: "Download Failed",
                message: "Could not download the receipt.",
                onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
            });
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: isPaid ? 40 : 100 }}>

                {/* 1️⃣ Payment Info */}
                <Card
                    style={[
                        styles.card,
                        payment.payment_status === "pending"
                            ? styles.pendingCard
                            : styles.paidCard,
                    ]}
                >
                    <Card.Content>
                        <Text style={styles.headerTitle}>Payment Info</Text>

                        <View style={styles.rowBetween}>
                            <Text style={styles.label}>Student</Text>
                            <Text style={styles.value}>{payment.student_name}</Text>
                        </View>

                        <View style={styles.rowBetween}>
                            <Text style={styles.label}>Created Date</Text>
                            <Text style={styles.value}>{createdDate}</Text>
                        </View>

                        <View style={styles.rowBetween}>
                            <Text style={styles.label}>Status</Text>
                            <Text
                                style={[
                                    styles.status,
                                    isPaid ? styles.statusPaid : styles.statusPending,
                                ]}
                            >
                                {isPaid ? "Paid" : "Pending"}
                            </Text>
                        </View>


                    </Card.Content>
                </Card>


                {/* 2️⃣ Payment Item Breakdown */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text style={styles.sectionTitle}>Payment Details</Text>

                        {details.map((d, index) => {
                            const name =
                                d.class_name ||
                                (d.service_name
                                    ? `${d.service_name}${d.service_attend_time
                                        ? ` (x ${d.service_attend_time})`
                                        : ""
                                    }`
                                    : "Item");


                            const isService = d.service_name && !d.class_name;

                            const price = isService
                                ? `RM ${Number(d.service_fee || 0).toFixed(2)}`
                                : `RM ${Number(d.class_fee || 0).toFixed(2)}`;

                            return (
                                <View key={index} style={styles.rowBetweenItem}>
                                    <Text style={styles.detailName}>{name}</Text>
                                    <Text style={styles.detailFee}>{price}</Text>
                                </View>
                            );
                        })}

                        <Divider style={{ marginVertical: 12 }} />

                        <View style={styles.rowBetween}>
                            <Text style={styles.label}>Subtotal (RM)</Text>
                            <Text style={styles.value}>{subtotal.toFixed(2)}</Text>
                        </View>

                        <View style={styles.rowBetween}>
                            <Text style={styles.label}>Discount (RM)</Text>
                            <Text style={styles.value}>
                                - {payment.discount_amt.toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.rowBetween}>
                            <Text style={styles.totalLabel}>Total Amount (RM)</Text>
                            <Text style={styles.totalAmount}>
                                {safe(payment.final_amt)}
                            </Text>
                        </View>

                        {/* ✔️ ONLY SHOW WHEN PAID */}
                        {isPaid && (
                            <>
                                <Divider style={{ marginVertical: 12 }} />

                                <View style={styles.rowBetween}>
                                    <Text style={styles.label}>Payment Method</Text>
                                    <Text style={styles.value}>
                                        {payment.method === "2"
                                            ? "Stripe"
                                            : payment.method === "3"
                                                ? "TNG Wallet"
                                                : payment.method === "1"
                                                    ? "Cash"
                                                    : "N/A"}
                                    </Text>
                                </View>

                                <View style={styles.rowBetween}>
                                    <Text style={styles.label}>Received Amount (RM)</Text>
                                    <Text style={styles.value}>
                                        {payment.received_amt?.toFixed(2) ?? "0.00"}
                                    </Text>
                                </View>

                                <View style={styles.rowBetween}>
                                    <Text style={styles.label}>Change Amount (RM)</Text>
                                    <Text style={styles.value}>
                                        {payment.change_amt?.toFixed(2) ?? "0.00"}
                                    </Text>
                                </View>
                            </>
                        )}
                    </Card.Content>
                </Card>

                {/* 3️⃣ Payment Method (hidden if paid) */}
                {!isPaid && (
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text style={styles.sectionTitle}>Select Payment Method</Text>

                            <RadioButton.Group onValueChange={setMethod} value={method}>
                                <View style={styles.radioRow}>
                                    <RadioButton value="2" />
                                    <Text style={styles.radioLabel}>Stripe</Text>
                                </View>
                            </RadioButton.Group>
                        </Card.Content>
                    </Card>
                )}
            </ScrollView>

            {/* 4️⃣ Bottom Button (hidden if paid) */}
            {!isPaid && (
                <BottomBar
                    disabled={!method || processingPayment}
                    label={processingPayment ? "Processing..." : "Proceed to Payment"}
                    onPress={startStripeFlow}
                />
            )}

            {isPaid && (
                <BottomBar
                    disabled={!online}
                    label="Download Receipt (PDF)"
                    onPress={downloadReceipt}
                />
            )}

            <SweetAlertModal
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                onConfirm={alertConfig.onConfirm || (() => setAlertConfig({ ...alertConfig, visible: false }))}
                onCancel={() => setAlertConfig({ ...alertConfig, visible: false })}
            />

            <LoadingOverlay
                visible={downloading}
                message="Downloading receipt..."
            />

            <LoadingOverlay visible={processingPayment} message="Processing payment..." />

        </View>
    );
}

//
// Styles
//
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F7FB" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    card: { marginVertical: 10, marginHorizontal: 16, borderRadius: 16 },
    headerTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 4,
    },
    rowBetweenItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
    },
    label: { fontSize: 14, color: "#555" },
    value: { fontSize: 14, fontWeight: "600" },
    detailName: { fontSize: 14, color: "#333", flex: 1 },
    detailFee: { fontSize: 14, fontWeight: "600", color: "#0078D4" },
    totalLabel: { fontSize: 15, fontWeight: "700", marginTop: 6 },
    totalAmount: { fontSize: 20, fontWeight: "800", color: "#0078D4" },
    status: { fontSize: 14, fontWeight: "700" },
    statusPending: { color: "#8B6D00" },
    statusPaid: { color: "#0A7A1C" },
    radioRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
    radioLabel: { fontSize: 15 },
    pendingCard: { backgroundColor: "#FFF8E1" },
    paidCard: { backgroundColor: "#E8F6EC" },
});
