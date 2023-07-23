import workspacesService from "@/services/workspaces-service";
import { useSubmitting } from "../../core/compositions/submitting";

export function useCreateWorkspace() {
  const { submit, submitting } = useSubmitting(workspacesService.create, {
    success: "Workspace created successfully",
    error: "Failed to create Workspace",
  });
  return {
    createWorkspace: submit,
    submitting,
  };
}
