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
      <div className="app-loader-fade mt-6" style={{ animationDelay: "300ms" }} aria-hidden="true">
        <div className="app-loader-clock relative h-16 w-16 rounded-full border-2 border-primary/30 bg-card shadow-sm">
          <span className="absolute left-1/2 top-1 h-1.5 w-0.5 -translate-x-1/2 rounded-full bg-primary/50" />
          <span className="absolute bottom-1 left-1/2 h-1.5 w-0.5 -translate-x-1/2 rounded-full bg-primary/50" />
          <span className="absolute right-1 top-1/2 h-0.5 w-1.5 -translate-y-1/2 rounded-full bg-primary/50" />
          <span className="absolute left-1 top-1/2 h-0.5 w-1.5 -translate-y-1/2 rounded-full bg-primary/50" />
          <span className="app-loader-clock-hour absolute bottom-1/2 left-1/2 h-4 w-1 origin-bottom rounded-full bg-primary" />
          <span className="app-loader-clock-minute absolute bottom-1/2 left-1/2 h-5 w-0.5 origin-bottom rounded-full bg-primary" />
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}