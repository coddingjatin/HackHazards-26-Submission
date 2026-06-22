import { useMemo } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { Reading } from "@/lib/types";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

export function TempChart({
  readings,
  upper,
  lower,
}: {
  readings: Reading[];
  upper: number;
  lower: number;
}) {
  const data = useMemo(() => {
    const labels = readings.map((r) => new Date(r.ts).toLocaleTimeString().slice(0, 8));
    return {
      labels,
      datasets: [
        {
          label: "Temperature °C",
          data: readings.map((r) => r.temp),
          borderColor: "rgb(34,47,90)",
          backgroundColor: "rgba(34,47,90,0.08)",
          fill: true,
          tension: 0.3,
          pointRadius: readings.map((r) => (r.status === "breach" ? 5 : 0)),
          pointBackgroundColor: readings.map((r) =>
            r.status === "breach" ? "rgb(220,38,38)" : "rgb(34,47,90)",
          ),
          pointBorderColor: "white",
        },
        {
          label: `Upper limit (${upper}°C)`,
          data: readings.map(() => upper),
          borderColor: "rgba(220,38,38,0.6)",
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: `Lower limit (${lower}°C)`,
          data: readings.map(() => lower),
          borderColor: "rgba(220,38,38,0.6)",
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [readings, upper, lower]);

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
        scales: {
          y: { suggestedMin: 0, suggestedMax: 11, ticks: { stepSize: 2 } },
          x: { ticks: { maxTicksLimit: 8, autoSkip: true } },
        },
      }}
    />
  );
}
