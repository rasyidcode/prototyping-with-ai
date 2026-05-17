const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function transformImage(
  base64Image: string,
  config: {
    standName: string;
    muscularity: number;
    sharpness: number;
  }
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transform`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Image,
        ...config,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error ?? "Image transformation failed");
    }

    return result.image;
  } catch (error) {
    console.error("Transformation Error:", error);
    throw error;
  }
}
