// src/Interfaces/orderSummaryProps.ts

import { shoppingCartModel } from "./index";

export interface orderSummaryProps {
  data: {
    cartItems: shoppingCartModel[];
    userId: string;
  };
  userInput: {
    name: string;
    phoneNumber: string;
    email: string;
  };
}
