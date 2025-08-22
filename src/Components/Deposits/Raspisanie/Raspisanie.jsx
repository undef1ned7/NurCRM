// Raspisanie.jsx
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import "./Raspisanie.scss";
import { Plus } from "lucide-react";
import { fetchEmployeesAsync } from "../../../store/creators/employeeCreators";
import {
  fetchEventsAsync,
  createEventAsync,
} from "../../../store/creators/eventsCreators";
import AddModal from "../AddModal/AddModal";

export default function Raspisanie() {
  const dispatch = useDispatch();
  const { list: events, creating, createError } = useSelector((s) => s.event);
  const calendarRef = useRef(null);
  const { employees } = useSelector((state) => state.employee);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    dispatch(fetchEventsAsync());
  }, [dispatch]);

  const mappedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.datetime,
    allDay: true,
  }));

  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
    setShowAddModal(true);
  };

  const handleSave = async (data) => {
    const isoDatetime = `${selectedDate}T${data.time || "09:00"}:00Z`;
    try {
      await dispatch(
        createEventAsync({ ...data, datetime: isoDatetime })
      ).unwrap();
      await dispatch(fetchEventsAsync()).unwrap();
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const goToDayView = () => {
    const api = calendarRef.current.getApi();
    api.changeView("dayGridDay");
  };

  return (
    <div className="raspisanie">
      <div className="raspisanie__header">
        <button onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Добавить событие
        </button>
        {/* <button onClick={goToDayView}>День</button> */}
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="ru"
        events={mappedEvents}
        dateClick={handleDateClick}
        editable={true}
        eventContent={(arg) => {
          // console.log(arg.event.start);
          const time = format(new Date(arg.event.start), "hh:mm a");
          return (
            <>
              <div>
                <b>{arg.event.title}</b>
              </div>
              <span>{time}</span>
            </>
          );
        }}
        height="auto"
      />

      {showAddModal && (
        <AddModal
          initialDate={selectedDate}
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
          isLoading={creating}
          error={createError}
        />
      )}
    </div>
  );
}
