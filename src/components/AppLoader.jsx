import React from "react";

// סדר גלי אלכסוני — כל אריח מקבל השהיה לפי המרחק מהפינה
const TILE_DELAYS = [0, 1, 2, 1, 2, 3, 2, 3, 4];

export default function AppLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background" role="status" aria-label="טוען את המערכת">
      <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {TILE_DELAYS.map((d, i) => (
          <div
            key={i}
            className="app-loader-tile h-4 w-4 rounded-[5px] bg-primary"
            style={{ animationDelay: `${d * 130}ms` }}
          />
        ))}
      </div>
      <h1 className="app-loader-fade mt-7 font-heading text-xl font-bold tracking-tight text-foreground">
        מערכת תורנויות
      </h1>
      <p className="app-loader-fade mt-1 text-sm font-medium text-muted-foreground" style={{ animationDelay: "200ms" }}>
        אורט ״הנרי״ רונסון
      </p>
      <div className="app-loader-fade mt-6 grid w-44 grid-cols-5 gap-1 rounded-lg border border-border bg-card p-2 shadow-sm" style={{ animationDelay: "300ms" }} aria-hidden="true">
        {Array.from({ length: 15 }, (_, i) => (
          <span
            key={i}
            className="app-loader-board-cell h-2.5 rounded-sm bg-primary"
            style={{ animationDelay: `${i * 110}ms` }}
          />
        ))}
      </div>
    </div>
  );
}