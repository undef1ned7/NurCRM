import { Navigate } from "react-router-dom";
import { useUser } from "./store/slices/userSlice";

const ProtectedRoute = ({ children }) => {
  const { company } = useUser();

  if (!company?.end_date) {
    return <Navigate to="/" replace />;
  }

  const endDate = new Date(company.end_date);
  const now = new Date();

  if (endDate < now) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
