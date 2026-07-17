import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { EmployeesApi } from "@/lib/endpoints";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/EmptyState";
import { cx } from "@/lib/format";

interface OrgNodeData {
  id: string; firstName: string; lastName: string; avatarUrl: string | null; designationTitle: string;
  departmentName: string; departmentColor: string; directReports: OrgNodeData[];
}

interface Section {
  node: OrgNodeData;
  depth: number;
  reportsTo: string | null;
}

// Ring color cycles by depth, echoing the app's palette (green -> brand -> gold -> violet).
const RING_BY_DEPTH = [
  "bg-success-500",
  "bg-brand-500",
  "bg-gold-500",
  "bg-[#8B72E0]",
];

// Walk the tree and pull out one "section" per manager that has direct reports —
// their card up top, their team in a branching row underneath, exactly like the
// reference chart. Each manager's section is then stacked below the previous one,
// so a manager with many peers never has to squeeze sideways into the same row.
function buildSections(node: OrgNodeData, depth: number, reportsTo: string | null, acc: Section[]) {
  if (node.directReports?.length) {
    acc.push({ node, depth, reportsTo });
    const parentName = `${node.firstName} ${node.lastName}`;
    node.directReports.forEach((child) => buildSections(child, depth + 1, parentName, acc));
  }
}

export default function OrgChart() {
  const { data, isLoading } = useQuery({ queryKey: ["org-chart"], queryFn: EmployeesApi.orgChart });

  const sections: Section[] = [];
  if (data?.length) {
    (data as OrgNodeData[]).forEach((root) => buildSections(root, 0, null, sections));
  }

  return (
    <div>
      <PageHeader title="Org Chart" subtitle="The full reporting structure of Aadhyaraj Technologies." />
      <div className="rounded-2xl border border-line/70 bg-white p-3 sm:rounded-3xl sm:p-6 md:p-8">
        {isLoading ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-56 rounded-full sm:h-16 sm:w-64" />)}
          </div>
        ) : !sections.length ? (
          <p className="text-sm text-ink-faint">No organization data yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-line/60">
            {sections.map(({ node, depth, reportsTo }) => (
              <TeamSection key={node.id} node={node} depth={depth} reportsTo={reportsTo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSection({ node, depth, reportsTo }: { node: OrgNodeData; depth: number; reportsTo: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 first:pt-0 last:pb-0 sm:gap-3 sm:py-8">
      {reportsTo && (
        <p className="text-[11px] uppercase tracking-wide text-ink-faint">Reports to {reportsTo}</p>
      )}
      <OrgCard node={node} depth={depth} />
      <div className="h-5 w-0.5 bg-line sm:h-7" />

      {/* Phones: employees stack in a single vertical trunk beneath the manager. */}
      <div className="flex flex-col items-center gap-5 sm:hidden">
        {node.directReports.map((child, i) => (
          <div key={child.id} className="flex flex-col items-center gap-5">
            {i > 0 && <div className="h-5 w-0.5 bg-line" />}
            <OrgCard node={child} depth={depth + 1} />
          </div>
        ))}
      </div>

      {/* Tablet & up: employees branch out horizontally, like the reference chart. */}
      <div className="hidden flex-wrap items-start justify-center gap-x-6 gap-y-6 border-t-2 border-line pt-7 sm:flex">
        {node.directReports.map((child) => (
          <div
            key={child.id}
            className="relative flex flex-col items-center before:absolute before:-top-7 before:left-1/2 before:h-7 before:w-0.5 before:-translate-x-1/2 before:bg-line"
          >
            <OrgCard node={child} depth={depth + 1} />
          </div>
        ))}
      </div>
    </div>
  );
}

function OrgCard({ node, depth }: { node: OrgNodeData; depth: number }) {
  const navigate = useNavigate();
  const ring = RING_BY_DEPTH[depth % RING_BY_DEPTH.length];
  const hasChildren = node.directReports?.length > 0;

  return (
    <button
      onClick={() => navigate(`/app/employees/${node.id}`)}
      className="group relative z-0 flex items-center gap-2 rounded-full border border-line/70 bg-canvas py-1.5 pl-1.5 pr-3 text-left shadow-soft transition duration-200 ease-out hover:z-20 hover:scale-[1.25] hover:border-brand-300 hover:shadow-lifted sm:gap-3 sm:py-2 sm:pl-2 sm:pr-5"
    >
      <span className="relative block h-10 w-10 shrink-0 sm:h-12 sm:w-12">
        <span className={cx("absolute inset-0 rounded-full", ring)} />
        {node.avatarUrl ? (
          <img
            src={node.avatarUrl}
            alt={`${node.firstName} ${node.lastName}`}
            className="absolute bottom-0 right-0 h-[30px] w-[30px] rounded-full object-cover ring-2 ring-white sm:h-9 sm:w-9"
          />
        ) : (
          <span className="absolute bottom-0 right-0 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink/10 text-[10px] font-semibold text-ink-soft ring-2 ring-white sm:h-9 sm:w-9 sm:text-[11px]">
            {node.firstName[0]}
            {node.lastName[0]}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <p className="whitespace-nowrap text-[12.5px] font-semibold text-ink sm:text-[13.5px]">{node.firstName} {node.lastName}</p>
        <p className="whitespace-nowrap text-[11px] text-ink-faint sm:text-[12px]">{node.designationTitle}</p>
      </span>
      {hasChildren && (
        <span className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium text-ink-faint ring-1 ring-line/70 sm:text-[11px]">
          <Users size={11} /> {node.directReports.length}
        </span>
      )}
    </button>
  );
}