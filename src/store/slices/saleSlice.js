import { createSlice } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import {
  createObject,
  deleteProductInCart,
  doSearch,
  getObjects,
  getProductCheckout,
  getProductInvoice,
  historySellProduct,
  historySellProductDetail,
  manualFilling,
  objectCartAddItem,
  productCheckout,
  sendBarCode,
  startSale,
  startSellObjects,
  updateProductInCart,
  updateSale,
  createDeal,
  historySellObjectDetail,
  historySellObjects, // <-- обработаем статусы создания сделок
} from "../creators/saleThunk";

const initialState = {
  start: null, // POS-продажа (товары)
  startObject: null, // Object-продажа (строительные)
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
  objects: [], // список object-items
  cartObject: null,
  lastDeal: null,
  historyObjects: [],
  historyObjectDetail: null,
};

const ensureError = (action) =>
  action.payload ?? { message: action.error?.message };

const saleSlice = createSlice({
  name: "sale",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // POS
      .addCase(startSale.pending, (state) => {
        state.loading = true;
      })
      .addCase(startSale.fulfilled, (state, { payload }) => {
        state.start = payload;
        state.loading = false;
      })
      .addCase(startSale.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(updateSale.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateSale.fulfilled, (state, { payload }) => {
        state.startObject = payload;
        state.loading = false;
      })
      .addCase(updateSale.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(manualFilling.pending, (state) => {
        state.loading = true;
      })
      .addCase(manualFilling.fulfilled, (state, { payload }) => {
        state.cart = payload;
        state.loading = false;
      })
      .addCase(manualFilling.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      // OBJECT SALES
      .addCase(startSellObjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(startSellObjects.fulfilled, (state, { payload }) => {
        state.startObject = payload; // ВАЖНО
        state.loading = false;
      })
      .addCase(startSellObjects.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(objectCartAddItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(objectCartAddItem.fulfilled, (state, { payload }) => {
        state.cartObject = payload;
        state.loading = false;
      })
      .addCase(objectCartAddItem.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(deleteProductInCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteProductInCart.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteProductInCart.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(updateProductInCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProductInCart.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateProductInCart.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(sendBarCode.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendBarCode.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.barcodeError = payload || {
          detail: "Что-то пошло не так. Попробуйте снова.",
        };
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
      .addCase(doSearch.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(historySellProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(historySellProduct.fulfilled, (state, { payload }) => {
        state.history = payload;
        state.loading = false;
      })
      .addCase(historySellProduct.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(historySellObjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(historySellObjects.fulfilled, (state, { payload }) => {
        state.historyObjects = payload;
        state.loading = false;
      })
      .addCase(historySellObjects.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(historySellProductDetail.pending, (state) => {
        state.loading = true;
      })
      .addCase(historySellProductDetail.fulfilled, (state, { payload }) => {
        state.historyDetail = payload;
        state.loading = false;
      })
      .addCase(historySellProductDetail.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(historySellObjectDetail.pending, (state) => {
        state.loading = true;
      })
      .addCase(historySellObjectDetail.fulfilled, (state, { payload }) => {
        state.historyObjectDetail = payload;
        state.loading = false;
      })
      .addCase(historySellObjectDetail.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(productCheckout.pending, (state) => {
        state.loading = true;
      })
      .addCase(productCheckout.fulfilled, (state, { payload }) => {
        state.checkout = payload;
        state.loading = false;
      })
      .addCase(productCheckout.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(getProductCheckout.pending, (state) => {
        state.loading = true;
      })
      .addCase(getProductCheckout.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(getProductCheckout.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(getProductInvoice.pending, (state) => {
        state.loading = true;
      })
      .addCase(getProductInvoice.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(getProductInvoice.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      .addCase(getObjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(getObjects.fulfilled, (state, { payload }) => {
        state.objects = payload;
        state.loading = false;
      })
      .addCase(getObjects.rejected, (state, action) => {
        state.error = ensureError(action);
        state.loading = false;
      })

      // Create Deal
      .addCase(createDeal.pending, (state) => {
        // можно завести отдельный флаг, но общего loading обычно хватает
      })
      .addCase(createDeal.fulfilled, (state, { payload }) => {
        state.lastDeal = payload; // если нужно отобразить где-то
      })
      .addCase(createDeal.rejected, (state, action) => {
        state.error = ensureError(action);
      });
  },
});

export const useSale = () => useSelector((state) => state.sale);
export default saleSlice.reducer;
