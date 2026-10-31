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
  createdById: string,
  client: any = db
): Promise<void> {
  const templates = await client
    .select()
    .from(checklistTemplates)
    .all();

  const matching = templates.filter((t: any) => t.type === type && t.isActive);

  for (const template of matching) {
    const checklistId = crypto.randomUUID();

    await client
      .insert(staffChecklists)
      .values({
        id: checklistId,
        staffId,
        templateId: template.id,
        type,
        createdById,
      })
      .run();

    const templateItems = await client
      .select()
      .from(checklistTemplateItems)
      .where(eq(checklistTemplateItems.templateId, template.id))
      .orderBy(asc(checklistTemplateItems.order))
      .all();

    if (templateItems.length > 0) {
      await client
        .insert(staffChecklistTasks)
        .values(
          templateItems.map((item: any) => ({
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
  createdById: string,
  client: any = db
): Promise<void> {
  await assignChecklistsFromTemplates(newStaffId, "onboarding", createdById, client);
}

/** Auto-assign all active offboarding checklists when staff is deactivated. */
export async function autoAssignOffboardingChecklists(
  staffId: string,
  deactivatedById: string,
  client: any = db
): Promise<void> {
  await assignChecklistsFromTemplates(staffId, "offboarding", deactivatedById, client);
}
