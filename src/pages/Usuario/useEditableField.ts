import { useState } from "react";
import { getApiErrorMessage } from "../../shared/services/apiClient";

export function useEditableField(
  initialValue: string,
  updateValue: (draft: string) => Promise<string>,
) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(value);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  async function save() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await updateValue(draft);
      setValue(result);
      setIsEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return { value, isEditing, draft, setDraft, isSubmitting, error, startEditing, cancelEditing, save };
}
