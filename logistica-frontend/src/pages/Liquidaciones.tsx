import { Outlet } from 'react-router-dom';

export default function Liquidaciones() {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-full">
      <Outlet />
    </div>
  );
}
