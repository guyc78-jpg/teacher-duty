import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fixLink, groupIdentical } from "@/lib/fixedReportUtils";

export default function ReportSection({ title, items, group = false }) {
  const [limit, setLimit] = useState(15), rows = group ? groupIdentical(items) : items;
  return <details className="rounded-xl border bg-card" open={rows.length > 0}>
    <summary className="cursor-pointer px-4 py-3 font-bold">{title} ({rows.length})</summary>
    <div className="space-y-2 border-t p-3">{rows.slice(0, limit).map((item, index) => <div key={`${item.message}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-muted p-2 text-sm">
      <span>{item.message}{item.count > 1 ? ` × ${item.count}` : ""}</span>
      {item.link && <Button asChild size="sm" variant="outline"><Link to={fixLink(item)}>לתיקון</Link></Button>}
    </div>)}
    {!rows.length && <p className="text-sm text-muted-foreground">אין פריטים להצגה</p>}
    {limit < rows.length && <Button variant="outline" onClick={() => setLimit(value => value + 15)}>טען עוד</Button>}</div>
  </details>;
}