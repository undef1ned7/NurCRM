// src/components/Clients/clientStore.js
import api from "../../Api/Api";

/**
 * Клиенты — ТОЛЬКО через бэкенд (/main/clients/).
 * localStorage НЕ используется.
 * Поле notes предполагается на бэке (если его нет — добавьте).
 */

const normalizeClient = (c) => ({
  id: c.id,
  type: c.type ?? "client",
  status: c.status ?? "new",
  full_name: c.full_name ?? "",
  phone: c.phone ?? "",
  notes: c.notes ?? "",
  created_at: c.created_at || null,
  updated_at: c.updated_at || null,
});

/* DRF: вытянуть все страницы */
async function fetchAllClients() {
  let url = "/main/clients/";
  const acc = [];
  let guard = 0;

  while (url && guard < 50) {
    const { data } = await api.get(url);
    const arr = Array.isArray(data?.results) ? data.results
              : Array.isArray(data) ? data : [];
    acc.push(...arr);
    url = data?.next || null;
    guard += 1;
  }
  return acc.map(normalizeClient);
}

/* public */
export async function getAll() {
  return await fetchAllClients();
}

export async function createClient(dto) {
  const payload = {
    type: "client",
    status: "new",
    full_name: (dto.full_name || "").trim(),
    phone: (dto.phone || "").trim(),
    notes: (dto.notes || "").trim(),
  };
  const { data } = await api.post("/main/clients/", payload);
  return normalizeClient(data);
}

export async function updateClient(id, patch) {
  const payload = {
    type: "client",
    full_name: (patch.full_name || "").trim(),
    phone: (patch.phone || "").trim(),
    notes: (patch.notes || "").trim(),
  };
  const { data } = await api.put(`/main/clients/${id}/`, payload);
  return normalizeClient(data);
}

export async function removeClient(id) {
  await api.delete(`/main/clients/${id}/`);
  return true;
}

/* ====== DEALS (как было) ====== */
export async function getDeals(clientId) {
  if (!clientId) return [];
  let url = `/main/clients/${clientId}/deals/`;
  const acc = [];
  let guard = 0;

  while (url && guard < 50) {
    const { data } = await api.get(url);
    const arr = Array.isArray(data?.results) ? data.results
              : Array.isArray(data) ? data : [];
    acc.push(...arr);
    url = data?.next || null;
    guard += 1;
  }
  return acc;
}

export async function createDeal(clientId, dto) {
  if (!clientId) throw new Error("clientId is required");
  const { data } = await api.post(`/main/clients/${clientId}/deals/`, { ...dto });
  return data;
}

export async function updateDeal(clientId, dealId, patch) {
  if (!clientId || !dealId) throw new Error("clientId and dealId are required");
  const { data } = await api.put(`/main/clients/${clientId}/deals/${dealId}/`, { ...patch });
  return data;
}

export async function removeDeal(clientId, dealId) {
  if (!clientId || !dealId) throw new Error("clientId and dealId are required");
  await api.delete(`/main/clients/${clientId}/deals/${dealId}/`);
  return true;
}
