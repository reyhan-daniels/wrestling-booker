"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Cadence } from "@/generated/prisma/enums";
import { bool, date, requiredDate, requiredText, text } from "@/lib/form";
import { getActiveWorld } from "@/lib/world";

export async function createCompany(data: FormData) {
  const world = await getActiveWorld();
  const company = await db.company.create({
    data: {
      worldId: world.id,
      name: requiredText(data, "name", "Name"),
      abbreviation: text(data, "abbreviation"),
      color: text(data, "color"),
      notes: text(data, "notes"),
    },
  });
  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(data: FormData) {
  const id = requiredText(data, "id", "Company");
  await db.company.update({
    where: { id },
    data: {
      name: requiredText(data, "name", "Name"),
      abbreviation: text(data, "abbreviation"),
      color: text(data, "color"),
      notes: text(data, "notes"),
    },
  });
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function deleteCompany(data: FormData) {
  const id = requiredText(data, "id", "Company");
  const played = await db.show.count({
    where: { isFinalized: true, companies: { some: { id } } },
  });
  if (played > 0) {
    throw new Error("This company has played shows, which are permanent history. It cannot be deleted.");
  }
  await db.company.delete({ where: { id } });
  revalidatePath("/companies");
  redirect("/companies");
}

// --- Titles -----------------------------------------------------------------

export async function createTitle(data: FormData) {
  const companyId = requiredText(data, "companyId", "Company");
  await db.title.create({
    data: {
      companyId,
      name: requiredText(data, "name", "Name"),
      notes: text(data, "notes"),
    },
  });
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/titles");
}

export async function updateTitle(data: FormData) {
  const id = requiredText(data, "id", "Title");
  const title = await db.title.update({
    where: { id },
    data: {
      name: requiredText(data, "name", "Name"),
      isActive: bool(data, "isActive"),
      notes: text(data, "notes"),
    },
  });
  revalidatePath(`/companies/${title.companyId}`);
  revalidatePath(`/titles/${id}`);
  revalidatePath("/titles");
}

export async function deleteTitle(data: FormData) {
  const id = requiredText(data, "id", "Title");
  const reigns = await db.reign.count({ where: { titleId: id } });
  if (reigns > 0) {
    throw new Error("This title has a lineage from played shows. Deactivate it instead of deleting it.");
  }
  const title = await db.title.delete({ where: { id } });
  revalidatePath(`/companies/${title.companyId}`);
  revalidatePath("/titles");
}

// --- Weekly series ----------------------------------------------------------

export async function createSeries(data: FormData) {
  const companyId = requiredText(data, "companyId", "Company");
  const cadence = String(data.get("cadence") ?? "");
  await db.weeklySeries.create({
    data: {
      companyId,
      name: requiredText(data, "name", "Name"),
      cadence: cadence in Cadence ? (cadence as Cadence) : Cadence.WEEKLY,
      startsOn: requiredDate(data, "startsOn", "Start date"),
    },
  });
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/calendar");
}

export async function updateSeries(data: FormData) {
  const id = requiredText(data, "id", "Series");
  const cadence = String(data.get("cadence") ?? "");
  const series = await db.weeklySeries.update({
    where: { id },
    data: {
      name: requiredText(data, "name", "Name"),
      cadence: cadence in Cadence ? (cadence as Cadence) : Cadence.WEEKLY,
      startsOn: requiredDate(data, "startsOn", "Start date"),
      endedOn: date(data, "endedOn"),
    },
  });
  revalidatePath(`/companies/${series.companyId}`);
  revalidatePath("/calendar");
}

export async function deleteSeries(data: FormData) {
  const id = requiredText(data, "id", "Series");
  const series = await db.weeklySeries.delete({ where: { id } });
  revalidatePath(`/companies/${series.companyId}`);
  revalidatePath("/calendar");
}
