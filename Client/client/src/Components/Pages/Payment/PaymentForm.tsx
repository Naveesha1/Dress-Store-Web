import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import React, { useState, useEffect } from "react";
import { useCreateOrderMutation } from "../../../Apis/orderApi";
import { toastNotify } from "../../../Helper";
import { cartItemModel } from "../../../Interfaces";
import { SD_Status } from "../../../Utility/SD";
import { useNavigate } from "react-router";

interface PaymentFormProps {
  data: {
    cartItems: cartItemModel[];
    userId: string;
    stripePaymentIntentId: string;
    clientSecret: string;
  };
  userInput: {
    name: string;
    phoneNumber: string;
    email: string;
  };
}

interface OrderResponse {
  isSuccess: boolean;
  result: {
    orderHeaderId: number;
    status: string;
  } | null;
  errorMessages: string[];
}

const PaymentForm: React.FC<PaymentFormProps> = ({ data, userInput }) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [createOrder] = useCreateOrderMutation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStripeReady, setIsStripeReady] = useState(false);

  const RETURN_URL = "https://example.com/order/123/complete";

  useEffect(() => {
    if (stripe && elements) {
      setIsStripeReady(true);
    }
  }, [stripe, elements]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!stripe || !elements) {
      toastNotify("Stripe has not been initialized", "error");
      return;
    }

    setIsProcessing(true);

    try {
      const { paymentIntent } = await stripe.retrievePaymentIntent(data.clientSecret);

      if (paymentIntent?.status === 'succeeded') {
        toastNotify("Payment has already been completed.", "info");
        setIsProcessing(false);
        return;
      }

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: RETURN_URL,
        },
        redirect: "if_required",
      });

      if (result.error) {
        console.error("Payment error:", result.error);
        toastNotify(result.error.message || "An unexpected error occurred.", "error");
      } else if (result.paymentIntent) {
        if (result.paymentIntent.status === "requires_action") {
          console.log("Payment requires additional action");
        } else if (result.paymentIntent.status === "succeeded") {
          await handleSuccessfulPayment(result.paymentIntent);
        } else {
          console.error("Unexpected PaymentIntent status:", result.paymentIntent.status);
          toastNotify("Unexpected payment state. Please try again.", "error");
        }
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      toastNotify("An unexpected error occurred during payment processing", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessfulPayment = async (paymentIntent: any) => {
    const orderDetails = createOrderDetails(data.cartItems);
    const orderData = {
      pickupName: userInput.name,
      pickupPhoneNumber: userInput.phoneNumber,
      pickupEmail: userInput.email,
      totalItems: orderDetails.totalItems,
      orderTotal: orderDetails.grandTotal,
      orderDetailsDTO: orderDetails.orderDetailsDTO,
      stripePaymentIntentID: paymentIntent.id,
      applicationUserId: data.userId,
      status: SD_Status.CONFIRMED,
    };

    console.log("Sending order data:", JSON.stringify(orderData, null, 2));
    try {
      const response: OrderResponse = await createOrder(orderData).unwrap();
      console.log("Order creation response:", response);

      if (response.isSuccess) {
        handleOrderResponse(response);
      } else {
        toastNotify("Failed to create order: " + (response.errorMessages?.join(", ") || "Unknown error"), "error");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toastNotify("Failed to create order. Please try again.", "error");
    }
  };

  const createOrderDetails = (cartItems: cartItemModel[]) => {
    let grandTotal = 0;
    let totalItems = 0;
    const orderDetailsDTO: any = [];

    cartItems.forEach((item: cartItemModel) => {
      if (item.menuItem?.id) {
        const tempOrderDetail: any = {
          menuItemId: item.menuItem.id,
          quantity: item.quantity || 0,
          itemName: item.menuItem.name || '',
          price: item.menuItem.price || 0
        };
        orderDetailsDTO.push(tempOrderDetail);
        grandTotal += (item.quantity || 0) * (item.menuItem.price || 0);
        totalItems += item.quantity || 0;
      } else {
        console.error("Invalid menuItem:", item);
      }
    });

    return { grandTotal, totalItems, orderDetailsDTO };
  };

  const handleOrderResponse = (response: OrderResponse): void => {
    if (response.isSuccess && response.result) {
      if (response.result.status === SD_Status.CONFIRMED) {
        navigate(`/order/orderConfirmed/${response.result.orderHeaderId}`);
      } else {
        navigate("/failed");
      }
    } else {
      toastNotify("Failed to create order", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" />
      <button
        disabled={!isStripeReady || isProcessing}
        className="btn btn-success mt-5 w-100"
        id="submit-button"
        type="submit"
      >
        <span id="button-text">
          {!isStripeReady ? "Loading..." : isProcessing ? "Processing..." : "Submit Order"}
        </span>
      </button>
    </form>
  );
};

export default PaymentForm;