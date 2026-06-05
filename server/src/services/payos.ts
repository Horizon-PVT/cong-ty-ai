import PayOS from "@payos/node";

const payosClientId = process.env.PAYOS_CLIENT_ID || "";
const payosApiKey = process.env.PAYOS_API_KEY || "";
const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY || "";

let payosInstance: any = null;

if (payosClientId && payosApiKey && payosChecksumKey) {
  // @ts-ignore
  const PayOSClass = typeof PayOS === 'function' ? PayOS : (PayOS.default || PayOS);
  payosInstance = new PayOSClass(payosClientId, payosApiKey, payosChecksumKey);
}

export function getPayOS() {
  if (!payosInstance) {
    throw new Error("Cổng thanh toán PayOS chưa được cấu hình. Thiếu các biến môi trường PAYOS_*.");
  }
  return payosInstance;
}
