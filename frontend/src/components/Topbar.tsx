import { FiSearch } from "react-icons/fi";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";

export default function Topbar({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" />
          <input
            placeholder="Buscar..."
            className="w-48 h-9 rounded-lg border border-gray-300 dark:border-gray-700 pl-9 pr-3 text-sm bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
