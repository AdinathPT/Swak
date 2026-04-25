import { useMemo } from "react";
import { RamRadialCharts } from "./RadialCharts";
import { calculateDashboardStats } from "../utils/service";
interface TypesForamttedData {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: string;
  discarded: boolean;
  rawThreatScore: number;
  ramUsage: number;
}

const StatItem = ({ label, value, color }: any) => (
  <div className="flex flex-col items-center justify-center p-2 border border-white/10 rounded-xl bg-slate-900/50 cursor-pointer hover:bg-slate-800/50 transition-colors">
    <span className={`${color} font-bold text-lg`}>{value}</span>
    <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
      {label}
    </span>
  </div>
);

export const OverallStats = ({ totalRamDetails, tabs }: any) => {
  const stats = useMemo(() => {
    return calculateDashboardStats(tabs || []);
  }, [tabs]);
  const totalCapacityGB = totalRamDetails ? totalRamDetails.capacity / 1024 : 0;
  const availableGB = totalRamDetails
    ? totalRamDetails.availableCapacity / 1024
    : 0;
  const usedCapacityGB = totalCapacityGB - availableGB;
  const ramPercentage =
    totalCapacityGB > 0
      ? Math.round((usedCapacityGB / totalCapacityGB) * 100)
      : 0;
  console.log(
    `totalRamDetails:`,
    totalCapacityGB,
    availableGB,
    usedCapacityGB,
    ramPercentage,
  );
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-2">
      <div className="RADIAL-GAUGE-CONTAINER mb-4">
        <RamRadialCharts
          ramPercentage={ramPercentage}
          totalCapacityGB={totalCapacityGB}
          usedCapacityGB={usedCapacityGB}
        />
      </div>

      <div className="grid grid-cols-4 gap-2 w-full">
        <StatItem
          label="Duplicate"
          value={stats.duplicates}
          color="text-yellow-500"
        />
        <StatItem
          label="Sleeping"
          value={stats.sleeping}
          color="text-blue-500"
        />
        <StatItem label="Heavy" value={stats.highRam} color="text-purple-500" />
        <StatItem
          label="Threat"
          value={stats.highThreat}
          color="text-red-500"
        />
      </div>
    </div>
  );
};
