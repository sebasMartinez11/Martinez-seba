import { useEffect, useState } from "react";
import { fetchLeads, fetchPropiedades } from "@/lib/api";

export default function Dashboard() {
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [propCount, setPropCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [leads, props] = await Promise.all([fetchLeads({}), fetchPropiedades({})]);
      setLeadCount(Array.isArray(leads) ? leads.length : 0);
      setPropCount(Array.isArray(props) ? props.length : 0);
    })();
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card title="Leads" value={leadCount ?? "—"} />
      <Card title="Propiedades" value={propCount ?? "—"} />
      <Card title="Estado" value="OK" subtitle="Backend /api/ activo" />
    </div>
  );
}

function Card({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>}
    </div>
  );
}
