import {
  getUserLastNameById,
  getUserImageById,
  getUserPhoneById,
  setUserData,
} from "@/server/data-access/user";

export async function fetchUserLastName(userId: string): Promise<string> {
  return await getUserLastNameById(userId);
}

export async function fetchUserImage(userId: string): Promise<string> {
  return await getUserImageById(userId);
}
export async function fetchUserPhone(userId: string): Promise<string> {
  return await getUserPhoneById(userId);
}
export async function updateUserData(userData: {
  userId: string;
  name: string;
  lastname: string;
  phone: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await setUserData(userData);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}
