// src/components/Clients/clientStore.js
import api from "../../../../api";

/**
 * Гибридное хранилище:
 * - Клиенты: через бекенд /main/clients/
 * - Локальные "экстры": заметки и массив броней (для ваших фильтров и карточки)
 */
const EXTRAS_KEY = "nurcrm_client_extras_v1"; // { [clientId]: { notes: "" } }
const BOOKINGS_KEY = "nurcrm_client_bookings_v1"; // { [clientId]: BookingRef[] }
const SEQ_KEY = "nurcrm_booking_seq_v1"; // для красивых номеров BR-YYYY-00001"

/* ===== утилиты локального хранения ===== */
function readExtras() {
  try {
    return JSON.parse(localStorage.getItem(EXTRAS_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeExtras(map) {
  localStorage.setItem(EXTRAS_KEY, JSON.stringify(map || {}));
}
function readBookingsMap() {
  try {
    return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeBookingsMap(map) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(map || {}));
}

/* ===== нормализация API ответа клиента ===== */
const normalizeClient = (c) => ({
  id: c.id,
  type: c.type ?? "client",
  full_name: c.full_name ?? "",
  phone: c.phone ?? "",
  created_at: c.created_at || null,
  updated_at: c.updated_at || null,
});

/* ===== подмешивание локальных данных к клиенту ===== */
function attachLocalToClients(list) {
  const extras = readExtras();
  const bmap = readBookingsMap();
  return list.map((c) => ({
    ...c,
    notes: extras[c.id]?.notes || "",
    bookings: Array.isArray(bmap[c.id]) ? bmap[c.id] : [],
  }));
}

/* ===== пагинация DRF (если есть) ===== */
async function fetchAllClients() {
  let url = "/main/clients/";
  const acc = [];
  let guard = 0;

  while (url && guard < 20) {
    const { data } = await api.get(url);
    const arr = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
      ? data
      : [];
    acc.push(...arr);
    url = data?.next || null; // может быть абсолютным
    guard += 1;
  }

  return acc.map(normalizeClient);
}

/* ===== Публичные функции, используемые UI ===== */

// GET список клиентов (с подмешанными локальными notes/bookings)
export async function getAll() {
  const base = await fetchAllClients();
  return attachLocalToClients(base);
}

// POST /main/clients/
export async function createClient(dto) {
  const payload = {
    type: "client",
    status: "new",
    full_name: (dto.full_name || "").trim(),
    phone: (dto.phone || "").trim(),
  };
  const { data } = await api.post("/main/clients/", payload);
  const created = normalizeClient(data);

  // сохранить локальные заметки
  if (typeof dto.notes === "string") {
    const extras = readExtras();
    extras[created.id] = {
      ...(extras[created.id] || {}),
      notes: dto.notes.trim(),
    };
    writeExtras(extras);
  }
  // вернуть с подмешанными локальными полями
  return attachLocalToClients([created])[0];
}

// PUT /main/clients/{id}/
export async function updateClient(id, patch) {
  const payload = {
    type: "client",
    full_name: (patch.full_name || "").trim(),
    phone: (patch.phone || "").trim(),
  };
  const { data } = await api.put(`/main/clients/${id}/`, payload);
  const updated = normalizeClient(data);

  // локальные заметки — отдельно
  if (Object.prototype.hasOwnProperty.call(patch, "notes")) {
    const extras = readExtras();
    extras[id] = { ...(extras[id] || {}), notes: (patch.notes || "").trim() };
    writeExtras(extras);
  }

  return attachLocalToClients([updated])[0];
}

// DELETE /main/clients/{id}/
export async function removeClient(id) {
  await api.delete(`/main/clients/${id}/`);
  const extras = readExtras();
  const bmap = readBookingsMap();
  delete extras[id];
  delete bmap[id];
  writeExtras(extras);
  writeBookingsMap(bmap);
  return true;
}

/* ===== генерация красивого номера брони ===== */
function nextBookingNumber(createdAtIso) {
  let seq = parseInt(localStorage.getItem(SEQ_KEY) || "1", 10);
  const year = createdAtIso
    ? new Date(createdAtIso).getFullYear()
    : new Date().getFullYear();
  const num = `BR-${year}-${String(seq).padStart(5, "0")}`;
  localStorage.setItem(SEQ_KEY, String(seq + 1));
  return num;
}

/** Привязать/обновить бронь у клиента (локально).
 * clientId = null  => удалить бронь из всех клиентов
 * ref: {
 *   id, number?, status, from, to, total, created_at?,
 *   hotel?, hotel_name?, room?, room_name?
 * }
 */
export function linkBookingToClient(clientId, ref) {
  if (!ref?.id) return null;
  const bmap = readBookingsMap();

  // 1) убрать у всех клиентов бронь с таким id
  Object.keys(bmap).forEach((cid) => {
    bmap[cid] = (bmap[cid] || []).filter((b) => b.id !== ref.id);
  });

  // 2) если clientId задан — добавить/обновить
  if (clientId) {
    const number = ref.number || nextBookingNumber(ref.created_at);

    // определить объект
    let obj_type = null,
      obj_id = null,
      obj_name = "";
    if (ref.hotel) {
      obj_type = "hotel";
      obj_id = ref.hotel;
      obj_name = ref.hotel_name || "";
    }
    if (ref.room) {
      obj_type = "room";
      obj_id = ref.room;
      obj_name = ref.room_name || obj_name;
    }

    const item = {
      id: ref.id,
      number,
      status: ref.status || "created",
      from: ref.from,
      to: ref.to,
      total: Number(ref.total) || 0,
      obj_type,
      obj_id,
      obj_name,
    };

    bmap[clientId] = [item, ...(bmap[clientId] || [])];
  }

  writeBookingsMap(bmap);
  return true;
}

/* =============================================================================
   DEALS (сделки клиента)
   Эндпоинты:
     - GET/POST /main/clients/{client_id}/deals/
     - PUT/DELETE /main/clients/{client_id}/deals/{deal_id}/
   ========================================================================== */

// Получить сделки клиента
export async function getDeals(clientId) {
  if (!clientId) return [];
  let url = `/main/clients/${clientId}/deals/`;
  const acc = [];
  let guard = 0;

  while (url && guard < 20) {
    const { data } = await api.get(url);
    const arr = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
      ? data
      : [];
    acc.push(...arr);
    url = data?.next || null;
    guard += 1;
  }
  return acc;
}

// Создать сделку клиенту
export async function createDeal(clientId, dto) {
  if (!clientId) throw new Error("clientId is required");
  const payload = {
    // положите сюда нужные поля сделки: title, amount, status и т.д.
    ...dto,
  };
  const { data } = await api.post(`/main/clients/${clientId}/deals/`, payload);
  return data;
}

// Обновить сделку
export async function updateDeal(clientId, dealId, patch) {
  if (!clientId || !dealId) throw new Error("clientId and dealId are required");
  const payload = { ...patch };
  const { data } = await api.put(
    `/main/clients/${clientId}/deals/${dealId}/`,
    payload
  );
  return data;
}

// Удалить сделку
export async function removeDeal(clientId, dealId) {
  if (!clientId || !dealId) throw new Error("clientId and dealId are required");
  await api.delete(`/main/clients/${clientId}/deals/${dealId}/`);
  return true;
}
