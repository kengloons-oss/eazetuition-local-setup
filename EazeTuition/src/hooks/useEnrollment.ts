import { API_BASE_URL } from "../config";

export function useEnrollment() {
  const createEnrollment = async (studentId: number, eduLvlId: number, intakeYear: string, classPairs: any[]) => {
    try {
      const res = await fetch(`${API_BASE_URL}/class/enrollment/mobile-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          edu_lvl_id: eduLvlId,
          intake_year: intakeYear,
          class_pairs: classPairs,
        }),
      });

      const json = await res.json();
      if (json.status !== "success") return { error: json.message };

      return { paymentId: json.payment_id };
    } catch (e) {
      return { error: "Network error, please try again." };
    }
  };

  const createStripePaymentSheet = async (paymentId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/payment/stripe/create-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId }),
      });

      const json = await res.json();
      if (json.error) return { error: json.error };

      return json;
    } catch (e) {
      return { error: "Stripe service unavailable." };
    }
  };

  // =====================================
  //  SERVICE ENROLLMENT
  // =====================================
  const createServiceEnrollment = async (
    studentId: number,
    serviceIds: number[],
    serviceType: string,
    totalFee: number,
    address?: string | null
  ) => {

    try {
      const res = await fetch(`${API_BASE_URL}/service/enrollment/mobile-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          service_ids: serviceIds,
          service_type: serviceType,
          total_fee: totalFee,
          address: address || null,
        }),
      });

      const json = await res.json();
      if (json.status !== "success") return { error: json.message };

      return { paymentId: json.payment_id };
    } catch (e) {
      return { error: "Network error, please try again." };
    }
  };


  /**
   * Create Stripe PaymentSheet for service payment
   * POST /payment/stripe/create-sheet-service
   */
  const createStripePaymentSheetForService = async (
    paymentId: number,
    address: string | null
  ) => {

    try {
      const res = await fetch(`${API_BASE_URL}/payment/stripe/create-sheet-service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, address: address ?? null }),
      });

      const json = await res.json();
      if (json.error) return { error: json.error };

      return json;
    } catch (e) {
      return { error: "Stripe service unavailable." };
    }
  };

  return {
    createEnrollment,
    createStripePaymentSheet,

    // NEW:
    createServiceEnrollment,
    createStripePaymentSheetForService,
  };
}


