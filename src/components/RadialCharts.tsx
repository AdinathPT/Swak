import {
  RadialBarChart,
  RadialBar,
  PolarRadiusAxis,
  Label,
  ResponsiveContainer,
} from "recharts";

interface RamChartProps {
  ramPercentage: number;
  totalCapacityGB: number;
  usedCapacityGB: number;
}

export const RamRadialCharts = ({
  ramPercentage,
  totalCapacityGB,
  usedCapacityGB,
}: RamChartProps) => {
  const chartData = [
    {
      name: "Memory",
      used: ramPercentage || 0,
      free: 100 - (ramPercentage || 0),
    },
  ];

  const statusColorClass =
    ramPercentage >= 85 ? "fill-red-500" : "fill-slate-300";
  const statusBarColor = ramPercentage >= 85 ? "#ef4444" : "#90CEFF";

  return (
    <div
      className="relative w-32 h-32 focus:outline-none flex flex-col items-center justify-center"
      style={{ width: "256px", height: "128px" }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        className="focus:outline-none z-10"
      >
        <RadialBarChart
          cx="50%"
          cy="80%"
          innerRadius="75%"
          outerRadius="100%"
          barSize={20}
          data={chartData}
          startAngle={180}
          endAngle={0}
          style={{ outline: "none" }}
        >
          <RadialBar
            dataKey="used"
            stackId="a"
            fill={statusBarColor}
            cornerRadius={5}
          />

          <RadialBar
            dataKey="free"
            stackId="a"
            fill="rgba(255, 255, 255, 0.05)"
            cornerRadius={5}
          />

          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 15}
                        className={`${statusColorClass} text-lg font-extrabold tracking-tight focus:outline-none`}
                      >
                        {ramPercentage}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 5}
                        className="fill-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]"
                      >
                        RAM IN USE
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="absolute bottom-1 flex w-full justify-between px-6 z-20 pointer-events-none">
        <div className="flex flex-col items-start">
          <span className="text-slate-400 text-xs font-bold">
            {usedCapacityGB.toFixed(1)} GB
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-slate-500 text-xs font-semibold">
            {totalCapacityGB.toFixed(1)} GB
          </span>
        </div>
      </div>
    </div>
  );
};
