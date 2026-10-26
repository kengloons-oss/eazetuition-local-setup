import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";

import SelectableCard from "../components/SelectableCard";
import { StatusTag } from "../components/StatusTag";   // ✅ NEW: 跟 EnrollNewClass 一样用 StatusTag
import { getAllStudents, getServiceEnrollmentsByStudent } from "../database/localDB";
import { API_BASE_URL } from "../config";
import { parentDropdownStyles, parentSelectStyles, parentDividerStyles } from "../styles/parentStyles";

// ⭐ 新增 import
import SweetAlertModal from "../components/SweetAlertModel";
import { useSweetAlert } from "../hooks/useSweetAlert";
import { useEnrollment } from "../hooks/useEnrollment";
import { useStripePayment } from "../hooks/useStripePayment";
import FloatingModal from "../components/FloatingModal";
import { syncLatestPayment, syncServiceEnrollments } from "../hooks/useLocalSyncHelper";


export default function EnrollNewServiceScreen() {
    const navigation = useNavigation();
    // ------------------------------
    //   GET ROUTE PARAM
    // ------------------------------
    const route = useRoute();
    const { student } = route.params as { student: any };

    // ------------------------------
    //   STATES
    // ------------------------------
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState(student);

    // Default should be "1" → Childcare
    const [selectedType, setSelectedType] = useState<string>("1");
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [enrolledServiceIds, setEnrolledServiceIds] = useState<number[]>([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

    // Transport only: address modal
    const [address, setAddress] = useState<string>("");
    const [addressModalVisible, setAddressModalVisible] = useState(false);
    const isTransport = selectedType === "2";


    // ✅ NEW: 总价
    const [totalFee, setTotalFee] = useState<number>(0);

    // ⭐ Payment
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
    const paymentOptions = ["Credit/Debit Card (Stripe)"];

    const { alert, showAlert, hideAlert } = useSweetAlert();
    const { createServiceEnrollment, createStripePaymentSheetForService } = useEnrollment();
    const { payWithStripe } = useStripePayment();

    const serviceTypes = [
        { label: "Childcare", value: "1" },
        { label: "Transport", value: "2" },
        { label: "Other", value: "3" },
    ];

    // ------------------------------
    //   LOAD CHILDREN (ONLY ONCE)
    // ------------------------------
    useEffect(() => {
        const kids = getAllStudents();
        setStudents(kids);
    }, []);

    // ------------------------------
    //   WHEN SELECTED CHILD CHANGES → LOAD ENROLLED LIST
    // ------------------------------
    useEffect(() => {
        if (!selectedStudent) return;

        const list = getServiceEnrollmentsByStudent(selectedStudent.student_id);
        setEnrolledServiceIds(list.map(s => s.service_id));

        // ✅ 换 child 时，清空选择 & 总价
        setSelectedServiceIds([]);
        setTotalFee(0);
    }, [selectedStudent]);

    // ------------------------------
    //   FETCH AVAILABLE SERVICES
    // ------------------------------
    useEffect(() => {
        if (!selectedStudent || !selectedType) return;
        fetchServices();
    }, [selectedStudent, selectedType]);

    const fetchServices = async () => {
        const url = `${API_BASE_URL}/service/enrollment/mobile/available?service_type=${selectedType}&student_id=${selectedStudent.student_id}`;
        console.log("📡 Fetching:", url);

        const res = await fetch(url);
        const text = await res.text();
        console.log("📩 Raw response:", text);

        try {
            const data = JSON.parse(text);
            setAvailableServices(data);

            // ✅ 换 type / 刷新 list 时，清空选择 & 总价
            setSelectedServiceIds([]);
            setTotalFee(0);
        } catch (err) {
            console.log("❌ JSON Parse Failed:", err);
        }
    };

    // ------------------------------
    //   Calculate single service fee for total
    // ------------------------------
    const calcServiceFee = (svc: any): number => {
        if (svc.service_type === "1") {
            return Number(svc.fee_month || 0);
        }
        if (svc.service_type === "2") {
            return Number(svc.deposit_fee || 0);
        }

        // 其他类型备用逻辑（防 future 扩展踩雷）
        if (svc.fee_type === "1") {
            return Number(svc.fee_month || 0);
        }
        if (svc.fee_type === "2") {
            return Number(svc.deposit_fee || 0);
        }
        return 0;
    };

    const recalcTotal = (ids: number[]) => {
        let sum = 0;
        ids.forEach(id => {
            const svc = availableServices.find((s: any) => s.service_id === id);
            if (!svc) return;
            sum += calcServiceFee(svc);
        });
        setTotalFee(sum);
    };

    // ------------------------------
    //   SELECT SERVICE (CHECKBOX / RADIO)
    // ------------------------------
    const toggleService = (id: number) => {
        if (selectedType === "2") {
            // Transport → only one allowed
            const newIds = [id];
            setSelectedServiceIds(newIds);
            recalcTotal(newIds);            // ✅ 重新计算总价
            return;
        }

        // Multi-select
        setSelectedServiceIds(prev => {
            const newIds = prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id];

            recalcTotal(newIds);            // ✅ 重新计算总价
            return newIds;
        });
    };

    const isRadio = selectedType === "2";

    // ------------------------------
    //   StatusTag helper
    // ------------------------------
    const buildStatusTag = (svc: any) => {
        if (svc.is_enrolled) {
            return <StatusTag label="Enrolled" bg="#DFF3E3" color="#2E7D32" />;
        }
        return <StatusTag label="Available" bg="#E0ECFF" color="#1E40AF" />;
    };

    // ======================================================
    // Payment Process Flow
    // ======================================================
    const isCheckoutDisabled =
        selectedServiceIds.length === 0 ||
        !paymentMethod ||
        (isTransport && address.trim().length < 5);


    const submitEnrollment = async () => {
        showAlert({
            type: "loading",
            message: "Processing payment...",
        });

        // 1) create enrollment
        const res = await createServiceEnrollment(
            selectedStudent.student_id,
            selectedServiceIds,
            selectedType,
            totalFee,
            isTransport ? address.trim() : null
        );


        if ("error" in res) {
            hideAlert();
            showAlert({
                type: "error",
                title: "Error",
                message: res.error,
                onConfirm: hideAlert,
            });
            return;
        }

        const paymentId = res.paymentId;

        // 2) create Stripe PaymentSheet
        const sheetRes = await createStripePaymentSheetForService(paymentId, isTransport ? address : null);

        if ("error" in sheetRes) {
            hideAlert();
            showAlert({
                type: "error",
                title: "Stripe Error",
                message: sheetRes.error,
                onConfirm: hideAlert,
            });
            return;
        }

        hideAlert();
        presentPaymentSheet(sheetRes, paymentId);

    };

    const presentPaymentSheet = async (stripeData: any, paymentId: number) => {
        // Step 1: 显示 Loading
        showAlert({
            type: "loading",
            message: "Processing payment...",
        });

        const result = await payWithStripe(stripeData);

        hideAlert(); // 先关 loading

        console.log("🔥 Stripe Result:", result);

        // ======================================================
        //  CANCELLED PAYMENT
        // ======================================================
        if ("cancelled" in result && result.cancelled) {

            // 🔥 Delete pending payment on backend
            try {
                const res = await fetch(`${API_BASE_URL}/payment/delete-pending/${paymentId}`, {
                    method: "DELETE",
                });
                const data = await res.json();

                if (!res.ok) {
                    console.log("❌ Delete payment failed:", data);
                }
            } catch (err) {
                console.log("❌ API error:", err);
            }

            // Show single-button alert
            showAlert({
                type: "warning",
                title: "Payment Cancelled",
                message: "Your payment has been cancelled.",
                onlyConfirm: true,
                onConfirm: hideAlert,
            });

            return;
        }

        // ======================================================
        //  FAILED PAYMENT
        // ======================================================
        if ("error" in result) {
            showAlert({
                type: "error",
                title: "Payment Failed",
                message: result.error || "Unknown payment error.",
                onConfirm: hideAlert,
            });
            return;
        }

        // ======================================================
        //  SUCCESS PAYMENT
        // ======================================================
        showAlert({
            type: "loading",
            message: "Syncing data...",
        });

        await syncServiceEnrollments([selectedStudent.student_id]);
        await syncLatestPayment(selectedStudent.parent_id);

        hideAlert();

        showAlert({
            type: "success",
            title: "Success",
            message: "Service enrollment completed!",
            onConfirm: () => {
                hideAlert();
                navigation.goBack();
            },
        });
    };


    // ------------------------------
    //   UI
    // ------------------------------
    return (
        <View style={styles.container}>

            {/* Child + Service Type */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 }}>

                {/* Child */}
                <View style={{ width: "48%" }}>
                    <Text style={parentSelectStyles.label}>Select Child</Text>

                    <Dropdown
                        style={parentDropdownStyles.dropdown}
                        placeholderStyle={parentDropdownStyles.placeholder}
                        selectedTextStyle={parentDropdownStyles.selectedText}
                        iconStyle={parentDropdownStyles.icon}
                        containerStyle={parentDropdownStyles.container}
                        itemTextStyle={parentDropdownStyles.itemText}

                        data={students.map(s => ({
                            label: s.name,
                            value: s.student_id,
                        }))}

                        labelField="label"
                        valueField="value"
                        placeholder="Select Child"
                        value={selectedStudent.student_id}

                        onChange={item => {
                            const found = students.find(s => s.student_id === item.value);
                            setSelectedStudent(found || null);
                        }}
                    />
                </View>

                {/* Service Type */}
                <View style={{ width: "48%" }}>
                    <Text style={parentSelectStyles.label}>Service Type</Text>

                    <Dropdown
                        style={parentDropdownStyles.dropdown}
                        data={serviceTypes}
                        labelField="label"
                        valueField="value"
                        placeholder="Select Type"
                        value={selectedType}
                        onChange={item => {
                            setSelectedType(item.value);
                            setSelectedServiceIds([]); // reset selection
                            setTotalFee(0);            // ✅ 换 type 也清空总价
                        }}
                    />
                </View>
            </View>

            <View style={parentDividerStyles.dashedDivider} />

            {/* List */}
            <ScrollView style={{ paddingHorizontal: 16 }}>
                {availableServices.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcons name="hammer-wrench" size={40} color="#999" />
                        <Text style={styles.emptyText}>No Service for this Service Type</Text>
                    </View>
                ) : (availableServices.map(svc => {

                    const disabled = svc.is_enrolled;
                    const selected = selectedServiceIds.includes(svc.service_id);
                    const statusTag = buildStatusTag(svc);

                    const mainFee =
                        svc.service_type === "1"
                            ? Number(svc.fee_month || 0)
                            : svc.service_type === "2"
                                ? Number(svc.deposit_fee || 0)
                                : calcServiceFee(svc);


                    // ✅ 文本区域里的 fee/description 布局
                    let classFeeLabel = "";
                    let classFeeValue = "";
                    let materialLikeLabel = "";
                    let materialLikeValue = "";

                    if (svc.service_type === "1") {
                        // Childcare: fee_month → class fee
                        classFeeLabel = "Deposit Fee";
                        classFeeValue = "-";
                        materialLikeLabel = "Monthly Fee";
                        materialLikeValue = `RM ${svc.fee_month}`;
                    } else if (svc.service_type === "2") {
                        // Transport:
                        // deposit_fee → class fee
                        // fee_attend → "Material Fee" 的位置
                        classFeeLabel = "Deposit";
                        classFeeValue = `RM ${svc.deposit_fee}`;
                        materialLikeLabel = "Per Attend Fee";
                        materialLikeValue = `RM ${svc.fee_attend}`;
                    } else {
                        // Other: 简单 fallback
                        classFeeLabel = "Class Fee";
                        classFeeValue = `RM ${svc.fee_month || svc.deposit_fee || 0}`;
                        materialLikeLabel = "Material / Extra";
                        materialLikeValue = svc.fee_attend ? `RM ${svc.fee_attend}` : "-";
                    }

                    return (
                        <SelectableCard
                            key={svc.service_id}
                            type={isRadio ? "radio" : "checkbox"}
                            selected={selected}
                            disabled={disabled}
                            onToggle={() => toggleService(svc.service_id)}
                            fee={mainFee}
                            statusTag={statusTag}
                        >
                            <Text style={{ fontSize: 16, fontWeight: "600" }}>
                                {svc.name}
                            </Text>

                            {/* Description */}
                            {svc.description ? (
                                <Text style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                                    {svc.description}
                                </Text>
                            ) : null}

                            {/* Fee rows */}
                            <Text style={{ fontSize: 13, color: "#220d0dff", marginTop: 4 }}>
                                {classFeeLabel}: {classFeeValue}
                            </Text>

                            <Text style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
                                {materialLikeLabel}: {materialLikeValue}
                            </Text>
                        </SelectableCard>
                    );
                }))}
            </ScrollView>

            {/* BOTTOM BAR */}
            <View style={styles.bottomBar}>
                <Text style={styles.totalText}>Total (RM): {totalFee.toFixed(2)}</Text>

                {/* ⭐ Payment Method */}
                <Text style={styles.paymentLabel}>Select Payment Method</Text>
                <Dropdown
                    style={[parentDropdownStyles.dropdown, { marginBottom: 20 }]}
                    data={paymentOptions.map(p => ({ label: p, value: p }))}
                    labelField="label"
                    valueField="value"
                    value={paymentMethod}
                    placeholder="Select Payment Method"
                    onChange={item => setPaymentMethod(item.value)}
                    disable={selectedServiceIds.length === 0}
                />

                {isTransport && (
                    <TouchableOpacity
                        style={styles.requiredInfoButton}
                        onPress={() => setAddressModalVisible(true)}
                    >
                        <MaterialCommunityIcons name="home-edit" size={20} color="#0077E6" />
                        <Text style={styles.requiredInfoText}>
                            Required Info: Transport Address
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Checkout */}
                <TouchableOpacity
                    disabled={isCheckoutDisabled}
                    style={[
                        styles.checkoutButton,
                        isCheckoutDisabled && { backgroundColor: "#ccc" }
                    ]}
                    onPress={() => {
                        showAlert({
                            type: "warning",
                            title: "Confirm Enrollment",
                            message: `Confirm enrolling ${selectedServiceIds.length} service(s) for ${selectedStudent.name}?`,
                            onConfirm: () => {
                                hideAlert();
                                submitEnrollment();
                            },
                            onCancel: hideAlert,
                        });
                    }}
                >
                    <Text
                        style={[
                            styles.checkoutButtonText,
                            isCheckoutDisabled && { color: "#777" }
                        ]}
                    >
                        Checkout Now
                    </Text>
                </TouchableOpacity>
            </View>

            <SweetAlertModal
                visible={alert.visible}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                onConfirm={alert.onConfirm}
                onCancel={alert.onCancel}
                onlyConfirm={alert.onlyConfirm}
            />

            {/* Address Modal -- using FloatingModal */}
            <FloatingModal
                visible={addressModalVisible}
                title="Transport Address"
                onClose={() => setAddressModalVisible(false)}
                onConfirm={() => {
                    if (address.trim().length < 5) {
                        showAlert({
                            type: "warning",
                            title: "Address Required",
                            message: "Please enter at least 5 characters.",
                            onConfirm: hideAlert,
                        });
                        return;
                    }
                    setAddressModalVisible(false);
                }}
                confirmText="Save"
            >
                <Text style={{ marginBottom: 8 }}>Address</Text>

                <TextInput
                    multiline
                    placeholder="Enter address..."
                    value={address}
                    onChangeText={setAddress}
                    style={{
                        minHeight: 80,
                        borderWidth: 1,
                        borderColor: "#ccc",
                        borderRadius: 8,
                        padding: 12,
                        backgroundColor: "#fff",
                        textAlignVertical: "top",
                    }}
                />
            </FloatingModal>


        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F6FB", // 跟 timetable 一样的背景
        paddingTop: 10,
    },

    bottomBar: {
        padding: 16,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderColor: "#eee",
    },

    totalText: {
        fontSize: 17,
        fontWeight: "700",
        color: "#333",
        marginBottom: 12,
    },

    paymentLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#444",
        marginBottom: 6,
    },

    paymentSelector: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 18,
        backgroundColor: "#fff",
    },

    paymentSelectorText: {
        fontSize: 15,
        color: "#333",
    },

    checkoutButton: {
        backgroundColor: "#0077E6",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
    },

    checkoutButtonText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "700",
    },
    emptyBox: {
        paddingVertical: 40,
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.7,
    },

    emptyText: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    requiredInfoButton: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#0077E6",
        borderRadius: 8,
        backgroundColor: "#E8F2FF",
    },

    requiredInfoText: {
        marginLeft: 8,
        fontSize: 14,
        color: "#0077E6",
        fontWeight: "600",
    },

});