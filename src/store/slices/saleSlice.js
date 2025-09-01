import { createSlice } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import {
  deleteProductInCart,
  doSearch,
  getProductCheckout,
  getProductInvoice,
  historySellProduct,
  historySellProductDetail,
  manualFilling,
  productCheckout,
  sendBarCode,
  startSale,
  updateSale,
} from "../creators/saleThunk";

const initialState = {
  start: null,
  loading: false,
  cart: null,
  error: null,
  barcode: null,
  barcodeError: null,
  foundProduct: [],
  checkout: null,
  history: [],
  historyDetail: null,
  pdf: null,
  // errorBarcode: null,
};

const saleSlice = createSlice({
  name: "sale",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(startSale.pending, (state) => {
        state.loading = true;
      })
      .addCase(startSale.fulfilled, (state, { payload }) => {
        state.start = payload;
        state.loading = false;
      })
      .addCase(startSale.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(updateSale.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateSale.fulfilled, (state, { payload }) => {
        state.start = payload;
        state.loading = false;
      })
      .addCase(updateSale.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(manualFilling.pending, (state) => {
        state.loading = true;
      })
      .addCase(manualFilling.fulfilled, (state, { payload }) => {
        state.cart = payload;
        state.loading = false;
      })
      .addCase(manualFilling.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(deleteProductInCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteProductInCart.fulfilled, (state) => {
        // state.cart = payload;
        state.loading = false;
      })
      .addCase(deleteProductInCart.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(sendBarCode.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendBarCode.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload) {
          state.barcodeError = payload;
        } else {
          state.barcodeError = {
            detail: "Что-то пошло не так. Попробуйте снова.",
          };
        }
      })
      .addCase(sendBarCode.rejected, (state, { payload }) => {
        state.barcodeError = payload;
        state.loading = false;
      })
      .addCase(doSearch.pending, (state) => {
        state.loading = true;
      })
      .addCase(doSearch.fulfilled, (state, { payload }) => {
        state.foundProduct = payload;
        state.loading = false;
      })
      .addCase(doSearch.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(historySellProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(historySellProduct.fulfilled, (state, { payload }) => {
        state.history = payload;
        state.loading = false;
      })
      .addCase(historySellProduct.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(historySellProductDetail.pending, (state) => {
        state.loading = true;
      })
      .addCase(historySellProductDetail.fulfilled, (state, { payload }) => {
        state.historyDetail = payload;
        state.loading = false;
      })
      .addCase(historySellProductDetail.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(productCheckout.pending, (state) => {
        state.loading = true;
      })
      .addCase(productCheckout.fulfilled, (state, { payload }) => {
        state.checkout = payload;
        state.loading = false;
      })
      .addCase(productCheckout.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(getProductCheckout.pending, (state) => {
        state.loading = true;
      })
      .addCase(getProductCheckout.fulfilled, (state, { payload }) => {
        // state.pdf = payload;
        state.loading = false;
      })
      .addCase(getProductCheckout.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      })
      .addCase(getProductInvoice.pending, (state) => {
        state.loading = true;
      })
      .addCase(getProductInvoice.fulfilled, (state, { payload }) => {
        // state.pdf = payload;
        state.loading = false;
      })
      .addCase(getProductInvoice.rejected, (state, { payload }) => {
        state.error = payload;
        state.loading = false;
      });
  },
});

// export const { setStart } = saleSlice.actions;
export const useSale = () => useSelector((state) => state.sale);
export default saleSlice.reducer;
