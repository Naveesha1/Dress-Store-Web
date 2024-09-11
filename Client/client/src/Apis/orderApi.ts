import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://localhost:7166/api/",
    prepareHeaders: (headers: Headers, api) => {
      const token = localStorage.getItem("token");
      token && headers.append("Authorization", "Bearer " + token);
    },
  }),
  tagTypes: ["Orders"],
  endpoints: (builder) => ({
    createOrder: builder.mutation({
      query: (orderDetails) => ({
        url: "order",
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: orderDetails,
      }),
      transformResponse: (response: any, meta, arg) => {
        // Ensure consistent response structure
        return {
          isSuccess: response.isSuccess ?? true,
          result: response.result ?? response,
          errorMessages: response.errorMessages ?? [],
        };
      },
      transformErrorResponse: (response: { status: number; data: any }) => {
        // Transform error responses to match success response structure
        return {
          isSuccess: false,
          result: null,
          errorMessages: [response.data.message || "An unknown error occurred"],
        };
      },
    }),
    getAllOrders: builder.query({
      query: ({ userId, searchString, status, pageNumber, pageSize }) => ({
        url: "order",
        params: {
          ...(userId && { userId }),
          ...(searchString && { searchString }),
          ...(status && { status }),
          ...(pageSize && { pageSize }),
          ...(pageNumber && { pageNumber }),
        },
      }),
      transformResponse(apiResponse: { result: any }, meta: any) {
        return {
          apiResponse,
          totalRecords: meta.response.headers.get("X-Pagination"),
        };
      },
      providesTags: ["Orders"],
    }),
    getOrderDetails: builder.query({
      query: (id) => ({
        url: `order/${id}`,
      }),
      providesTags: ["Orders"],
    }),
    updateOrderHeader: builder.mutation({
      query: (orderDetails) => ({
        url: "order/" + orderDetails.orderHeaderId,
        method: "PUT",
        headers: {
          "Content-type": "application/json",
        },
        body: orderDetails,
      }),
      invalidatesTags: ["Orders"],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetAllOrdersQuery,
  useGetOrderDetailsQuery,
  useUpdateOrderHeaderMutation,
} = orderApi;
export default orderApi;