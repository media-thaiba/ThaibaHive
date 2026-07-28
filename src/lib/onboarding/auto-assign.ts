import { db } from "@/db";
import {
  staffChecklists,
  staffChecklistTasks,
  checklistTemplateItems,
  checklistTemplates,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";

async function assignChecklistsFromTemplates(
  staffId: string,
  type: "onboarding" | "offboarding",
  createdById: string
): Promise<void> {
  const templates = await db
    .select()
    .from(checklistTemplates)
    .all();

  const matching = templates.filter((t) => t.type === type && t.isActive);

  for (const template of matching) {
    const checklistId = crypto.randomUUID();

    await db
      .insert(staffChecklists)
      .values({
        id: checklistId,
        staffId,
        templateId: template.id,
        type,
        createdById,
      })
      .run();

    const templateItems = await db
      .select()
      .from(checklistTemplateItems)
      .where(eq(checklistTemplateItems.templateId, template.id))
      .orderBy(asc(checklistTemplateItems.order))
      .all();

    if (templateItems.length > 0) {
      await db
        .insert(staffChecklistTasks)
        .values(
          templateItems.map((item) => ({
            id: crypto.randomUUID(),
            checklistId,
            title: item.title,
            description: item.description,
            order: item.order,
          }))
        )
        .run();
    }
  }
}

/** Auto-assign all active onboarding checklists to a newly created staff member. */
export async function autoAssignOnboardingChecklists(
  newStaffId: string,
  createdById: string
): Promise<void> {
  try {
    await assignChecklistsFromTemplates(newStaffId, "onboarding", createdById);
  } catch (err) {
    console.error("[autoAssignOnboardingChecklists] Failed:", err);
  }
}

/** Auto-assign all active offboarding checklists when staff is deactivated. */
export async function autoAssignOffboardingChecklists(
  staffId: string,
  deactivatedById: string
): Promise<void> {
  try {
    await assignChecklistsFromTemplates(staffId, "offboarding", deactivatedById);
  } catch (err) {
    console.error("[autoAssignOffboardingChecklists] Failed:", err);
  }
}
