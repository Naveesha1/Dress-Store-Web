import React, { useState } from "react";
import { getStatusColor } from "../../../Helper";
import { cartItemModel } from "../../../Interfaces";
import { orderSummaryProps } from "./orderSummaryProps";
import { useNavigate } from "react-router-dom";
import { SD_Roles, SD_Status } from "../../../Utility/SD";
import { RootState } from "../../../Storage/Redux/Store";
import { useSelector } from "react-redux";
import { useUpdateOrderHeaderMutation } from "../../../Apis/orderApi";
import { MainLoader } from "../Common";

function OrderSummary({ data, userInput }: orderSummaryProps) {
  const [orderStatus, setOrderStatus] = useState<SD_Status>(data.status!);
  const badgeTypeColor = getStatusColor(orderStatus);
  const navigate = useNavigate();
  const userData = useSelector((state: RootState) => state.userAuthStore);
  const [loading, setIsLoading] = useState(false);
  const [updateOrderHeader] = useUpdateOrderHeaderMutation();

  const getNextStatus = (currentStatus: SD_Status): { color: string; value: SD_Status } | null => {
    switch (currentStatus) {
      case SD_Status.CONFIRMED:
        return { color: "info", value: SD_Status.PACKED };
      case SD_Status.PACKED:
        return { color: "warning", value: SD_Status.OUT_FOR_DELIVERY };
      case SD_Status.OUT_FOR_DELIVERY:
        return { color: "success", value: SD_Status.DELIVERED };
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus(orderStatus);

  const handleNextStatus = async () => {
    if (!nextStatus) return;

    setIsLoading(true);
    try {
      const result = await updateOrderHeader({
        orderHeaderId: data.id,
        status: nextStatus.value,
        pickupName: userInput.name,
        pickupPhoneNumber: userInput.phoneNumber,
        pickupEmail: userInput.email,
      }).unwrap();

      if (result && result.isSuccess) {
        setOrderStatus(nextStatus.value);
      } else {
        console.error("Failed to update order status:", result);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const result = await updateOrderHeader({
        orderHeaderId: data.id,
        status: SD_Status.CANCELLED,
        pickupName: userInput.name,
        pickupPhoneNumber: userInput.phoneNumber,
        pickupEmail: userInput.email,
      }).unwrap();

      if (result && result.isSuccess) {
        setOrderStatus(SD_Status.CANCELLED);
      } else {
        console.error("Failed to cancel order:", result);
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div>
      {loading && <MainLoader />}
      {!loading && (
        <>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="text-success">Order Summary</h3>
            <span className={`btn btn-outline-${badgeTypeColor} fs-6`}>
              {data.status}
            </span>
          </div>
          <div className="mt-3">
            <div className="border py-3 px-2">Name : {userInput.name}</div>
            <div className="border py-3 px-2">Email : {userInput.email}</div>
            <div className="border py-3 px-2">
              Phone : {userInput.phoneNumber}
            </div>
            <div className="border py-3 px-2">
              <h4 className="text-success">Ordered Items</h4>
              <div className="p-3">
                {data.cartItems?.map(
                  (cartItem: cartItemModel, index: number) => {
                    return (
                      <div className="d-flex" key={index}>
                        <div className="d-flex w-100 justify-content-between">
                          <p>{cartItem.menuItem?.name}</p>
                          <p>
                            ${cartItem.menuItem?.price} x {cartItem.quantity} =
                          </p>
                        </div>
                        <p style={{ width: "70px", textAlign: "right" }}>
                          $
                          {(cartItem.menuItem?.price ?? 0) *
                            (cartItem.quantity ?? 0)}
                        </p>
                      </div>
                    );
                  }
                )}

                <hr />
                <h4 className="text-danger" style={{ textAlign: "right" }}>
                  ${data.cartTotal?.toFixed(2)}
                </h4>
              </div>
            </div>
          </div>
            <div className="d-flex justify-content-between align-items-center mt-3">
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>
              Back to Orders
            </button>
            {userData.role === SD_Roles.ADMIN && (
              <div className="d-flex">
                {orderStatus !== SD_Status.CANCELLED &&
                  orderStatus !== SD_Status.DELIVERED && (
                    <button
                      className="btn btn-danger mx-2"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  )}
                {nextStatus && (
                  <button
                    className={`btn btn-${nextStatus.color}`}
                    onClick={handleNextStatus}
                  >
                    {nextStatus.value}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default OrderSummary;