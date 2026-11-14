import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

export async function generatePromptPayDataUrl(
  promptPayId: string,
  amount: number
): Promise<string> {
  try {
    const cleanId = String(promptPayId || "").replace(/[^0-9]/g, "");
    if (!cleanId) return "";

    const payload = generatePayload(cleanId, { amount: Math.max(0, amount) });
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: {
        dark: "#222222",
        light: "#FFFFFF",
      },
    });
    return dataUrl;
  } catch (err) {
    console.error("Error generating PromptPay QR:", err);
    return "";
  }
}
