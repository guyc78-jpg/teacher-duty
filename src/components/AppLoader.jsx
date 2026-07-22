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
      <p className="app-loader-fade mt-1 text-xs text-muted-foreground" style={{ animationDelay: "250ms" }}>
        מסדרים את הלוח…
      </p>
      <div className="app-loader-fade mt-7 h-0.5 w-44 overflow-hidden rounded-full bg-muted" style={{ animationDelay: "350ms" }}>
        <div className="app-loader-bar h-full w-full origin-right rounded-full bg-primary" />
      </div>
    </div>
  );
}