import { createCompany } from "@/lib/actions/companies";
import { BackLink, PageHeader } from "@/components/ui";

export const metadata = { title: "New company — Wrestling Booker" };

export default function NewCompanyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/companies">Companies</BackLink>
      <PageHeader title="New company" />
      <form action={createCompany} className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="abbreviation">Abbreviation</label>
            <input id="abbreviation" name="abbreviation" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="color">Accent colour</label>
            <input id="color" name="color" type="color" defaultValue="#3b82f6" className="field h-11 p-1" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} className="field" />
        </div>
        <button type="submit" className="btn-primary w-full">Create company</button>
      </form>
    </div>
  );
}
