export const shortenAddress = (address: string, length = 4): string =>
  `${address.slice(0, length + 2)}...${address.slice(-length)}`;

export const formatDateFromTimestamp = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp) * 1000);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTimeFromTimestamp = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp) * 1000);

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format duration in minutes to readable string (e.g., "1h 15m" or "45m")
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${remainingMinutes}m`;
  }
};

export const getElapsedTime = (
  startTimestamp: bigint,
  endTimestamp: bigint,
): string => {
  const startTime = new Date(Number(startTimestamp) * 1000);
  const endTime = new Date(Number(endTimestamp) * 1000);
  const elapsedMs = endTime.getTime() - startTime.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  return formatDuration(elapsedMinutes);
};
