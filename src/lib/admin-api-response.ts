export async function readJsonResponse<T = Record<string, unknown>>(
  response: Response,
  label: string
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const snippet = (await response.text()).slice(0, 160).replace(/\s+/g, " ").trim();
    throw new Error(
      `${label} returned ${response.status} with a non-JSON response. ${snippet || "Check that the API route exists and you are signed in as admin."}`
    );
  }

  return (await response.json()) as T;
}
