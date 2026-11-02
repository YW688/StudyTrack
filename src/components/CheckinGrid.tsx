import dayjs from "dayjs";
import type { GreenMatrix } from "../lib/ledger";

interface CheckinGridProps {
  matrix: GreenMatrix;
  variant?: "full" | "compact";
}

const WEEKDAY_MARKS = ["一", "", "三", "", "五", "", "日"];

export default function CheckinGrid({
  matrix,
  variant = "full",
}: CheckinGridProps) {
  const full = variant === "full";
  const weeks = matrix.weeks.length;

  return (
    <div
      className={full ? "checkin is-full" : "checkin is-compact"}
      role="group"
      aria-label={`近 ${weeks} 周打卡 ${matrix.activeDays} 天有结果`}
    >
      {full && (
        <div aria-hidden="true" className="checkin-months">
          {matrix.weeks.map((week) => (
            <span key={week.key}>{week.monthLabel ?? ""}</span>
          ))}
        </div>
      )}

      <div className="checkin-body">
        {full && (
          <div aria-hidden="true" className="checkin-weekdays">
            {WEEKDAY_MARKS.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        )}

        <div
          role="img"
          aria-label={`近 ${weeks} 周打卡 ${matrix.activeDays} 天有结果`}
          className="checkin-weeks"
        >
          {matrix.weeks.map((week) => (
            <div key={week.key} className="checkin-week">
              {week.days.map((day) => (
                <span
                  key={day.dateKey}
                  title={`${dayjs(day.dateKey).format("M月D日")} ${
                    day.level > 0 ? `${day.level} 格记录` : "没有记录"
                  }${day.isToday ? " 今天" : ""}`}
                  data-level={day.level}
                  data-today={day.isToday ? "1" : undefined}
                  data-future={day.isFuture ? "1" : undefined}
                  className="checkin-cell"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {full && (
        <div aria-hidden="true" className="checkin-legend">
          <span>少</span>
          {[0, 1, 2, 3].map((level) => (
            <span
              key={level}
              data-level={level}
              className="checkin-cell"
            />
          ))}
          <span>多</span>
        </div>
      )}
    </div>
  );
}
