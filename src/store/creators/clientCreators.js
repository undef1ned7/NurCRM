import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/";
export const fetchClientsAsync = createAsyncThunk(
  "client/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/main/clients/", { params });
      return data; // { count, next, previous, results }
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const createClientAsync = createAsyncThunk(
  "client/create",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/main/clients/", payload);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const updateClientAsync = createAsyncThunk(
  "client/update",
  async ({ clientId, updatedData }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `/main/clients/${clientId}/`,
        updatedData
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deleteClientAsync = createAsyncThunk(
  "client/delete",
  async (clientId, { rejectWithValue }) => {
    try {
      await api.delete(`/main/clients/${clientId}/`);
      return clientId;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getItemClient = createAsyncThunk(
  "client/getItem",
  async (clientId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/main/clients/${clientId}/`);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);
