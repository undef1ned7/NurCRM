import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useClient } from "../../../store/slices/ClientSlice";
import { useParams } from "react-router-dom";
import { getItemClient } from "../../../store/creators/clientCreators";

const ClientDetail = () => {
  const { client } = useClient();
  const dispatch = useDispatch();
  const { id } = useParams();

  // console.log(id);
  const statusOptions = [
    { value: "all", label: "Все" },
    { value: "new", label: "Новый" },
    { value: "contacted", label: "Контакт установлен" },
    { value: "interested", label: "Заинтересован" },
    { value: "converted", label: "Конвертирован" },
    { value: "inactive", label: "Неактивный" },
    { value: "paid_for", label: "оплачено" },
    { value: "awaiting", label: "ожидает" },
    { value: "credit", label: "долг" },
    { value: "rejection", label: "отказ" },
  ];
  // console.log(client);
  useEffect(() => {
    dispatch(getItemClient(id));
  }, [id]);
  return (
    <div className="clientDetail">
      <div className="row">
        <div className="col-6">
          <div className="clientDetail__first">
            <h2>ФИО: {client?.full_name}</h2>
            <p>Company: {client?.company}</p>
          </div>
        </div>
        <div className="col-6">
          <div className="clientDetail__second">
            <p>Номер телефона: {client?.phone}</p>
            <div>
              <p>
                Дата создания: {new Date(client.created_at).toLocaleString()}
              </p>
              <p>
                Дата обновления: {new Date(client.updated_at).toLocaleString()}
              </p>
            </div>
            <select className="employee__search-wrapper" name="" id="">
              {statusOptions.map((status, index) => (
                <option key={index} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;
