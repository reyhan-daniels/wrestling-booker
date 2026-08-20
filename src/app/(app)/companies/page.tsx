import Link from "next/link";
import { db } from "@/lib/db";
import { getActiveWorld } from "@/lib/world";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Companies — Wrestling Booker" };

export default async function CompaniesPage() {
  const world = await getActiveWorld();
  const companies = await db.company.findMany({
    where: { worldId: world.id },
    include: {
      _count: { select: { titles: true, series: true, shows: true } },
      contracts: { where: { endedOn: null }, select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="A company employs wrestlers; it never owns them."
        action={<Link href="/companies/new" className="btn-primary">New</Link>}
      />

      {companies.length === 0 ? (
        <Empty>
          No companies yet.{" "}
          <Link href="/companies/new" className="text-plan-300 underline">Create one.</Link>
        </Empty>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {companies.map((company) => (
            <li key={company.id} className="card p-4">
              <Link href={`/companies/${company.id}`} className="font-semibold hover:text-plan-300">
                {company.name}
              </Link>
              {company.abbreviation && (
                <span className="ml-2 text-xs text-ink-500">{company.abbreviation}</span>
              )}
              <p className="mt-2 text-xs text-ink-500">
                {company.contracts.length} under contract · {company._count.titles} title
                {company._count.titles === 1 ? "" : "s"} · {company._count.series} series ·{" "}
                {company._count.shows} show{company._count.shows === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
