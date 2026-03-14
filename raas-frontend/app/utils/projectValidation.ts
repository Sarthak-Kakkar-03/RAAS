export async function validateProjectKey(
  base_url: string,
  projectId: string,
  apiKey: string,
) {
  try {
    const response = await fetch(`${base_url}/projects/${projectId}/validate`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const validationResult = (await response.json()) as { valid: boolean };
    return validationResult.valid;
  } catch {
    return false;
  }
}
