import { createSlice } from "@reduxjs/toolkit";
import {
  fetchClientsAsync,
  createClientAsync,
  updateClientAsync,
  deleteClientAsync,
  getItemClient,
} from "../creators/clientCreators";
import { useSelector } from "react-redux";

const initialState = {
  list: [],
  count: null,
  next: null,
  previous: null,
  loading: false,
  error: null,
  creating: false,
  updating: false,
  deleting: false,
  client: null,
};

const clientSlice = createSlice({
  name: "client",
  initialState,
  reducers: {
    clearClients(state) {
      state.list = [];
      state.count = null;
      state.next = null;
      state.previous = null;
    },
  },
  extraReducers(builder) {
    // --- fetch list ---
    builder
      .addCase(fetchClientsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientsAsync.fulfilled, (state, action) => {
        const { results, count, next, previous } = action.payload;
        state.list = results;
        state.count = count;
        state.next = next;
        state.previous = previous;
        state.loading = false;
      })
      .addCase(fetchClientsAsync.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      // --- create ---
      .addCase(createClientAsync.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createClientAsync.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.creating = false;
      })
      .addCase(createClientAsync.rejected, (state, action) => {
        state.error = action.payload;
        state.creating = false;
      })
      // --- update ---
      .addCase(updateClientAsync.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateClientAsync.fulfilled, (state, action) => {
        const idx = state.list.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
        state.updating = false;
      })
      .addCase(updateClientAsync.rejected, (state, action) => {
        state.error = action.payload;
        state.updating = false;
      })
      // --- delete ---
      .addCase(deleteClientAsync.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteClientAsync.fulfilled, (state, action) => {
        state.list = state.list.filter((c) => c.id !== action.payload);
        state.deleting = false;
      })
      .addCase(deleteClientAsync.rejected, (state, action) => {
        state.error = action.payload;
        state.deleting = false;
      })
      .addCase(getItemClient.pending, (state) => {
        state.loading = true;
        // state.deleting = false;
      })
      .addCase(getItemClient.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.client = payload;
      })
      .addCase(getItemClient.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  },
});
export const { clearClients } = clientSlice.actions;
export const useClient = () => useSelector((state) => state.client);
export default clientSlice.reducer;
