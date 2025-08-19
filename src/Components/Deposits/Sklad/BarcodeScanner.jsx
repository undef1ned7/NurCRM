import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import useScanDetection from "use-scan-detection";
import { sendBarCode } from "../../../store/creators/productCreators";

const BarcodeScanner = () => {
  const [barcodeScan, setBarcodeScan] = useState("s");
  const dispatch = useDispatch();

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
      dispatch(sendBarCode(barcodeScan));
    }
  }, [barcodeScan, dispatch]);

  return (
    <div>
      <p>{barcodeScan || "Ожидание сканирования..."}</p>
    </div>
  );
};

export default BarcodeScanner;
