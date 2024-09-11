import  cartItemModel  from "./cartItemModel";

export interface PaymentFormProps {
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

