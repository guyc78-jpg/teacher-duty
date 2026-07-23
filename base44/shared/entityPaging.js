export async function loadAll(entity, query = {}, sort = "created_date", pageSize = 500) {
  const records = [];
  for (let skip = 0; skip < 5000; skip += pageSize) {
    const page = await entity.filter(query, sort, pageSize, skip);
    records.push(...page);
    if (page.length < pageSize) break;
  }
  return records;
}