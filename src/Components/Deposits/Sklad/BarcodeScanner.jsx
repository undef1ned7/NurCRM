import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import useScanDetection from "use-scan-detection";
import { sendBarCode } from "../../../store/creators/saleThunk";
// import { sendBarCode } from "../../../store/creators/productCreators";

const BarcodeScanner = ({ id}) => {
  const [barcodeScan, setBarcodeScan] = useState("");
  const dispatch = useDispatch();
  // const id = "some-sale-id";
  useScanDetection({
    onComplete: (scanned) => {
      if (scanned.length >= 3) {
        setBarcodeScan(scanned);
      }
    },
    minLength: 3,
  });

  useEffect(() => {
    if (barcodeScan) {
      dispatch(sendBarCode({ barcode: barcodeScan, id }));
      dispatch()
    }
  }, [barcodeScan, dispatch]);

  return (
    <div>
      <p>{barcodeScan || "Ожидание сканирования..."}</p>
    </div>
  );
};

export default BarcodeScanner;
