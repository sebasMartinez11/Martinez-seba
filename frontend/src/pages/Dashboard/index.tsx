export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Bienvenido a Real Connect</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Este es tu panel principal. Acá vas a ver métricas, actividad reciente y accesos rápidos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">KPI 1</div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">KPI 2</div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">KPI 3</div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">KPI 4</div>
      </div>
    </div>
  );
}
