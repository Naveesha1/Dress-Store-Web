import React from "react";
import { useLocation, Navigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentForm from "../Components/Pages/Payment/PaymentForm";
import OrderSummary from "../Components/Pages/Order/OrderSummary";

function Payment() {
  const location = useLocation();
  const state = location.state as { apiResult?: any; userInput?: any } | null;

  if (!state || !state.apiResult || !state.userInput) {
    // Redirect to home or error page if state is missing
    return <Navigate to="/" />;
  }

  const { apiResult, userInput } = state;

  const stripePromise = loadStripe(
    "pk_test_51PRd9rCcwvI3TsBTwNxom59qeo1rdeW8KRTncbyrJLE5Nil6u8LiiaajengHxzd9ydPto1hHEHKMklciwAOFKLw600zZZAwVuM"
  );

  const options = {
    clientSecret: apiResult.clientSecret,
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <div className="container m-5 p-5">
        <div className="row">
          <div className="col-md-7">
            <OrderSummary data={apiResult} userInput={userInput} />
          </div>
          <div className="col-md-4 offset-md-1">
            <h3 className="text-success">Payment</h3>
            <div className="mt-5">
              <PaymentForm data={apiResult} userInput={userInput} />
            </div>
          </div>
        </div>
      </div>
    </Elements>
  );
}

export default Payment;