function businessDelayMs(n, startIso) {
  const start = new Date(startIso);
  let d = new Date(start),
    added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.getTime() - start.getTime();
}
module.exports = { businessDelayMs };
