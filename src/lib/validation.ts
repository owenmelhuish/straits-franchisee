type ValidationRule = {
  field: string;
  required?: boolean;
  type?: "string" | "number" | "object" | "boolean";
  maxLength?: number;
};

type ValidationResult =
  | { valid: true; data: Record<string, unknown> }
  | { valid: false; error: string };

export function validateBody(
  body: unknown,
  rules: ValidationRule[]
): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const data = body as Record<string, unknown>;

  for (const rule of rules) {
    const value = data[rule.field];

    if (rule.required && (value === undefined || value === null || value === "")) {
      return { valid: false, error: `"${rule.field}" is required` };
    }

    if (value !== undefined && value !== null && rule.type) {
      const actualType = typeof value;
      if (rule.type === "object" && (actualType !== "object" || Array.isArray(value) === false && actualType !== "object")) {
        // Allow objects and arrays for "object" type
      } else if (rule.type !== "object" && actualType !== rule.type) {
        return {
          valid: false,
          error: `"${rule.field}" must be of type ${rule.type}, got ${actualType}`,
        };
      }
    }

    if (value && rule.maxLength && typeof value === "string" && value.length > rule.maxLength) {
      return {
        valid: false,
        error: `"${rule.field}" exceeds max length of ${rule.maxLength}`,
      };
    }
  }

  return { valid: true, data };
}

export const submissionRules: ValidationRule[] = [
  { field: "template_id", required: true, type: "string" },
  { field: "format_name", required: true, type: "string", maxLength: 100 },
  { field: "file_url", required: true, type: "string", maxLength: 2048 },
  { field: "slide_file_urls", type: "object" }, // array or null
  { field: "selections", required: true, type: "object" },
  { field: "campaign_start", type: "string" },
  { field: "campaign_end", type: "string" },
  { field: "budget", type: "number" },
];

export const templateCreateRules: ValidationRule[] = [
  { field: "name", required: true, type: "string", maxLength: 200 },
  { field: "slug", required: true, type: "string", maxLength: 200 },
  { field: "status", type: "string" },
  { field: "config", required: true, type: "object" },
];

export const templateUpdateRules: ValidationRule[] = [
  { field: "name", type: "string", maxLength: 200 },
  { field: "slug", type: "string", maxLength: 200 },
  { field: "status", type: "string" },
  { field: "config", type: "object" },
];
