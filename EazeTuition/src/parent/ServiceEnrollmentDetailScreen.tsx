import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
} from "react-native";
import { TextInput as PaperInput } from "react-native-paper";
import { Card, ActivityIndicator, Divider } from "react-native-paper";
import { useRoute } from "@react-navigation/native";

import NetInfo from "@react-native-community/netinfo";
import { useSweetAlert } from "../hooks/useSweetAlert";
import SweetAlertModal from "../components/SweetAlertModel";


import {
    getServiceEnrollment,
    upsertServiceEnrollment,
} from "../database/localDB";

import { API_BASE_URL } from "../config";
import BottomBar from "../components/BottomBar"; // ⚠️ 你已有的组件

export default function ServiceEnrollmentDetailScreen() {
    const route = useRoute();
    const { service_enrollment_id } = route.params as {
        service_enrollment_id: number;
    };

    const [loading, setLoading] = useState(true);
    const [svc, setSvc] = useState<any>(null);

    const [address, setAddress] = useState(""); // inline editable
    const [hasChanged, setHasChanged] = useState(false); // detect changes

    const { alert, showAlert, hideAlert } = useSweetAlert();

    // =====================================================
    //     LOAD DETAIL
    // =====================================================
    useEffect(() => {
        loadDetail();
    }, []);

    const loadDetail = async () => {
        setLoading(true);

        const net = await NetInfo.fetch();

        // 1️⃣ Online: fetch direct from backend
        if (net.isConnected) {
            try {
                const url = `${API_BASE_URL}/service/enrollment/mobile/detail/${service_enrollment_id}`;
                console.log("Calling:", url);

                const res = await fetch(url);
                const data = await res.json();

                if (res.ok) {
                    // Store into SQLite
                    upsertServiceEnrollment(data);

                    // Update UI
                    setSvc(data);
                    setAddress(data.address || "");
                    setHasChanged(false);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.log("⚠️ Backend fetch failed:", err);
            }
        }

        // 2️⃣ Offline fallback — use local SQLite
        const local = getServiceEnrollment(
            service_enrollment_id
        );

        if (local.length > 0) {
            const found = local[0];
            setSvc(found);
            setAddress(found.address || "");
        }

        setHasChanged(false);
        setLoading(false);
    };


    // =====================================================
    //     UPDATE ADDRESS
    // =====================================================
    const handleSubmit = () => {
        if (!address.trim()) {
            showAlert({
                type: "warning",
                title: "Required",
                message: "Address cannot be empty.",
                onConfirm: hideAlert,
            });
            return;
        }


        showAlert({
            type: "warning",
            title: "Confirm Update",
            message: "Are you sure you want to update this address?",
            onConfirm: () => {
                hideAlert();
                submitUpdate();
            },
            onCancel: hideAlert,
        });

    };

    const submitUpdate = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/service/enrollment/update_address`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    service_enrollment_id,
                    address,
                }),
            });

            const updated = await res.json();

            upsertServiceEnrollment(updated);

            setHasChanged(false);
            loadDetail();

            showAlert({
                type: "success",
                title: "Updated",
                message: "Address updated successfully.",
                onConfirm: hideAlert,
            });

        } catch (err) {
            showAlert({
                type: "error",
                title: "Error",
                message: "Failed to update address.",
                onConfirm: hideAlert,
            });

        }
    };

    // =====================================================
    //     RENDER
    // =====================================================

    if (loading || !svc) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const isActive = svc.status?.toString() === "1";
    const isTransport = svc.service_type?.toString() === "2";

    const originalAddress = svc.address || "";
    const isButtonEnabled =
        isTransport && isActive && hasChanged && address.trim() !== originalAddress;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

                {/* ------------------------------------------------- */}
                {/* Card 1: Service Info */}
                {/* ------------------------------------------------- */}
                <Card
                    style={[
                        styles.card,
                        isActive ? styles.activeCard : styles.inactiveCard,
                    ]}
                >
                    <Card.Content>
                        <Text style={styles.headerTitle}>Service Info</Text>

                        {/* Service Name */}
                        <View style={styles.itemBlock}>
                            <Text style={styles.label}>Service Name</Text>
                            <Text style={styles.blockValue}>{svc.service_name}</Text>
                        </View>

                        {/* Service Description */}
                        <View style={styles.itemBlock}>
                            <Text style={styles.label}>Service Description</Text>
                            <Text style={styles.blockValue}>{svc.description}</Text>
                        </View>

                        {/* Status */}
                        <View style={styles.itemBlock}>
                            <Text style={styles.label}>Status</Text>
                            <Text
                                style={[
                                    styles.blockValue,
                                    isActive ? styles.statusActive : styles.statusInactive,
                                ]}
                            >
                                {isActive ? "Active" : "Inactive"}
                            </Text>
                        </View>

                        {/* Enrolled On */}
                        <View style={styles.itemBlock}>
                            <Text style={styles.label}>Enrolled On</Text>
                            <Text style={styles.blockValue}>{svc.enroll_datetime}</Text>
                        </View>
                    </Card.Content>

                </Card>

                {/* ------------------------------------------------- */}
                {/* Card 2: Fee Info + Editable Address */}
                {/* ------------------------------------------------- */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text style={styles.sectionTitle}>Service Details</Text>

                        {/* Fee Info */}

                        {svc.fee_type === "1" ? (
                            <>
                                <View style={styles.rowBetween}>
                                    <Text style={styles.label}>Monthly Fee</Text>
                                    <Text style={styles.value}> RM {Number(svc.fee_month).toFixed(2)}</Text>
                                </View>

                            </>
                        ) : (
                            <>
                                <View style={styles.rowBetween}>
                                    <Text style={styles.label}>Deposit Fee</Text>
                                    <Text style={styles.value}> RM {Number(svc.deposit_fee).toFixed(2)}</Text>
                                </View>

                                <View style={styles.rowBetween}>
                                    <Text style={styles.label}>Fee Per Attend</Text>
                                    <Text style={styles.value}>RM {Number(svc.fee_attend).toFixed(2)}</Text>
                                </View>
                            </>
                        )}

                        {isTransport && (
                            <>
                                <Divider style={styles.divider} />
                                <Text style={styles.label}>Transport Address</Text>

                                <PaperInput
                                    mode="outlined"
                                    multiline
                                    style={{ marginTop: 6 }}
                                    value={address}
                                    onChangeText={(text) => {
                                        setAddress(text);
                                        setHasChanged(text !== originalAddress);
                                    }}
                                    editable={isActive}
                                    outlineColor={isActive ? undefined : "#CCC"}
                                />

                            </>
                        )}
                    </Card.Content>
                </Card>
            </ScrollView>

            {/* ------------------------------------------------- */}
            {/* BottomBar Button */}
            {/* ------------------------------------------------- */}
            {isTransport && (
                <BottomBar
                    disabled={!isButtonEnabled}
                    label="Update Address"
                    onPress={handleSubmit}
                />
            )}

            <SweetAlertModal
                visible={alert.visible}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                onConfirm={alert.onConfirm}
                onCancel={alert.onCancel}
            />

        </View>
    );
}

//
// Styles
//
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6FB" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    card: {
        marginHorizontal: 16,
        marginVertical: 10,
        borderRadius: 16,
        paddingVertical: 10,
    },

    activeCard: { backgroundColor: "#E8F6EC" },
    inactiveCard: { backgroundColor: "#F8D7DA" },

    headerTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 6,
    },

    label: { fontSize: 14, color: "#555", fontWeight: "700" },
    value: { fontSize: 15, fontWeight: "600", color: "#222" },

    divider: { marginVertical: 14 },

    statusText: { fontSize: 14, fontWeight: "700" },
    statusActive: { color: "#2E7D32" },
    statusInactive: { color: "#B00020" },

    addressInput: {
        backgroundColor: "#F2F2F2",
        borderRadius: 8,
        padding: 10,
        minHeight: 80,
        textAlignVertical: "top",
        fontSize: 15,
        marginTop: 6,
    },
    itemBlock: {
        marginVertical: 8,
    },

    blockValue: { fontSize: 15, color: "#222", marginTop: 3, lineHeight: 20 },

});
