
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeContainerRepair(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: `Bạn là chuyên gia kiểm định container. Hãy phân tích hình ảnh sửa chữa này. 
            Xác định: 
            1. Loại hư hỏng/sửa chữa (ví dụ: hàn, vá tấm, sơn lại, thay gioăng).
            2. Đánh giá chất lượng sửa chữa (Tốt/Cần làm lại).
            3. Mã số container nếu nhìn thấy.
            Trả về kết quả bằng tiếng Việt một cách chuyên nghiệp.`
          }
        ]
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Không thể phân tích hình ảnh vào lúc này.";
  }
}
