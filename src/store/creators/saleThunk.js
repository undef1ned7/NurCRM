import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

export const startSale = createAsyncThunk(
  "sale/start",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/main/pos/sales/start/");
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);
export const updateSale = createAsyncThunk(
  "sale/update",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/pos/sales/start/`);
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const manualFilling = createAsyncThunk(
  "sale/manualFilling",
  async ({ id, productId }, { rejectWithValue }) => {
    try {
      const { data: response } = await api.post(
        `/main/pos/sales/${id}/add-item/`,
        { product_id: productId }
      );
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const deleteProductInCart = createAsyncThunk(
  "sale/deleteProductInCart",
  async ({ id, productId }, { rejectWithValue }) => {
    try {
      await api.delete(`/main/pos/carts/${id}/items/${productId}/`);
      // return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const sendBarCode = createAsyncThunk(
  "products/sendBarcode",
  async ({ barcode, id }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/api/main/pos/sales/${id}/scan/`,
        barcode
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const doSearch = createAsyncThunk(
  "products/doSearch",
  async (search, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/products/list/`, {
        params: search,
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const historySellProduct = createAsyncThunk(
  "products/historySellProduct",
  async (search, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/pos/sales/`, {
        params: search,
      });
      return data.results;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const historySellProductDetail = createAsyncThunk(
  "products/historySellProductDetail",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/pos/sales/${id}/`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const productCheckout = createAsyncThunk(
  "products/productCheckout",
  async ({ id, bool }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`main/pos/sales/${id}/checkout/`, {
        print_receipt: bool,
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
